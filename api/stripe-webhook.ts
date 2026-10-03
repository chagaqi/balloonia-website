// POST /api/stripe-webhook  (Stripe -> us)
// checkout.session.completed / async_payment_succeeded: write the order + its lines
// from the saved cart, then email the customer and the ops inbox (and ping Telegram
// for live orders). charge.refunded: mark the order refunded.
// Idempotent on the Stripe session id, so Stripe's retries never double an order.
//
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      RESEND_API_KEY, optional SHOP_OPS_EMAIL (default contact@balloonia.events),
//      optional SHOP_TEST_OPS_EMAIL (ops copy for test-mode orders; skipped if unset),
//      TELEGRAM_BOT_TOKEN + BRENDA_CHAT_ID / DH_CHAT_ID (live orders only).

import {
  env,
  json,
  sbInsert,
  sbSelect,
  sbUpdate,
  storagePost,
  stripe,
  verifyStripeSignature,
  cad,
  deliveryZoneWarning,
  distanceFromShopKm,
  getSetting,
  type PricedLine,
} from '../src/lib/shop/server';
import { customerEmail, opsEmail, sendEmail, type OrderForEmail } from '../src/lib/shop/emails';

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const raw = await req.text();
  let ok = false;
  try {
    ok = await verifyStripeSignature(raw, req.headers.get('stripe-signature'), env('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('webhook secret missing', err instanceof Error ? err.message : err);
    return json({ error: 'not configured' }, 500);
  }
  if (!ok) return json({ error: 'bad signature' }, 400);

  const event = JSON.parse(raw);
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const s = event.data.object;
      if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
        return json({ received: true, skipped: 'not paid yet' });
      }
      const result = await recordOrder(s.id);
      return json({ received: true, ...result });
    }
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      if (charge.payment_intent) {
        const full = charge.amount_refunded >= charge.amount;
        await sbUpdate('orders', `stripe_payment_intent=eq.${encodeURIComponent(charge.payment_intent)}`, {
          status: full ? 'refunded' : 'partially_refunded',
        });
      }
      return json({ received: true });
    }
    return json({ received: true, ignored: event.type });
  } catch (err) {
    console.error('webhook failed', event?.type, err instanceof Error ? err.message : err);
    // 500 makes Stripe retry (it backs off for up to 3 days).
    return json({ error: 'processing failed' }, 500);
  }
}

async function recordOrder(sessionId: string) {
  const existing = await sbSelect(`orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=id,number,emails_sent_at`);
  if (existing.length && existing[0].emails_sent_at) return { duplicate: true, number: existing[0].number };

  const s = await stripe<any>(
    'GET',
    `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=shipping_cost.shipping_rate&expand[]=total_details.breakdown&expand[]=payment_intent`,
  );
  const cartId = s.metadata?.cart_id;
  const [cart] = cartId ? await sbSelect(`carts?id=eq.${encodeURIComponent(cartId)}&select=*`) : [];
  if (!cart) throw new Error(`cart ${cartId} not found for session ${sessionId}`);
  const lines: PricedLine[] = cart.items;

  const rate = s.shipping_cost?.shipping_rate;
  const deliveryId = rate?.metadata?.delivery_id || null;
  const deliveryLabel = rate?.display_name || null;
  const discounts = s.total_details?.breakdown?.discounts ?? [];
  const promo = discounts[0]?.discount?.promotion_code || discounts[0]?.discount?.coupon?.name || null;
  const shipping = s.shipping_details || s.collected_information?.shipping_details || null;
  const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null);

  // Stripe's manual tax rates do not tax shipping, so a delivery rate marked hst_rate in
  // its metadata already includes HST in its price ($75 + 13% = $84.75). Record it the
  // way the books need it: $75 delivery, and its HST added to the order's tax total.
  const shipGrossCents = s.total_details?.amount_shipping ?? 0;
  const shipHstRate = Number(rate?.metadata?.hst_rate || 0);
  const shipNetCents = shipHstRate > 0 ? Math.round(shipGrossCents / (1 + shipHstRate)) : shipGrossCents;
  const shipHstCents = shipGrossCents - shipNetCents;

  let order = existing[0];
  if (!order) {
    try {
      [order] = await sbInsert('orders', {
        stripe_session_id: s.id,
        stripe_payment_intent: pi,
        email: s.customer_details?.email ?? null,
        phone: s.customer_details?.phone ?? null,
        name: s.customer_details?.name ?? shipping?.name ?? null,
        shipping,
        delivery_method: deliveryId,
        subtotal: s.amount_subtotal / 100,
        shipping_total: shipNetCents / 100,
        tax_total: ((s.total_details?.amount_tax ?? 0) + shipHstCents) / 100,
        discount_total: (s.total_details?.amount_discount ?? 0) / 100,
        total: s.amount_total / 100,
        promo_code: typeof promo === 'string' ? promo : null,
        note: cart.note,
        status: 'paid',
        livemode: !!s.livemode,
      });
    } catch (err) {
      // A concurrent delivery of the same event won the insert; use its row.
      if ((err as { status?: number }).status === 409) {
        [order] = await sbSelect(`orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&select=*`);
        if (order?.emails_sent_at) return { duplicate: true, number: order.number };
      } else throw err;
    }
  }
  if (!order) throw new Error('order insert failed');
  const haveItems = await sbSelect(`order_items?order_id=eq.${order.id}&select=id&limit=1`);
  if (!haveItems.length) {
    await sbInsert(
      'order_items',
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        variant_id: l.variantId,
        handle: l.handle,
        title: l.title,
        variant_title: l.variantTitle,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        addons_total: l.addons,
        line_total: l.lineTotal,
        selections: l.selections,
        uploads: l.uploads,
      })),
      'return=minimal',
    );
  }
  let [full] = await sbSelect(`orders?id=eq.${order.id}&select=*`);

  // Check the delivery band against the address (free zone vs $75 band).
  if (full.delivery_km == null && deliveryId && deliveryId !== 'pickup') {
    try {
      const delivery = await getSetting<{ origin: { lat: number; lon: number }; options: any[] }>('delivery');
      if (delivery?.origin) {
        const km = await distanceFromShopKm(shipping?.address, delivery.origin);
        const warning = deliveryZoneWarning(deliveryId, km, delivery.options);
        if (km != null) {
          await sbUpdate('orders', `id=eq.${full.id}`, { delivery_km: km, delivery_warning: warning });
          full = { ...full, delivery_km: km, delivery_warning: warning };
        }
      }
    } catch (err) {
      console.error('delivery check failed', err instanceof Error ? err.message : err);
    }
  }

  // Seven-day links to customer uploads for the ops email.
  const uploadLinks: Record<string, string> = {};
  for (const path of lines.flatMap((l) => l.uploads)) {
    try {
      const signed = await storagePost(`object/sign/customer-uploads/${path}`, { expiresIn: 60 * 60 * 24 * 7 });
      if (signed?.signedURL) uploadLinks[path] = `${env('SUPABASE_URL').replace(/\/$/, '')}/storage/v1${signed.signedURL}`;
    } catch (err) {
      console.error('sign upload failed', path, err instanceof Error ? err.message : err);
    }
  }

  const data: OrderForEmail = {
    number: full.number,
    email: full.email,
    name: full.name,
    phone: full.phone,
    deliveryLabel,
    deliveryId,
    deliveryKm: full.delivery_km != null ? Number(full.delivery_km) : null,
    deliveryWarning: full.delivery_warning ?? null,
    shipping,
    subtotal: Number(full.subtotal),
    shippingTotal: Number(full.shipping_total),
    taxTotal: Number(full.tax_total),
    discountTotal: Number(full.discount_total),
    total: Number(full.total),
    promoCode: full.promo_code,
    note: full.note,
    livemode: !!full.livemode,
    paymentIntent: full.stripe_payment_intent,
    items: lines.map((l) => ({
      title: l.title,
      handle: l.handle,
      variantTitle: l.variantTitle,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      selections: l.selections,
    })),
  };

  const tasks: Promise<unknown>[] = [];
  if (data.email) tasks.push(sendEmail(data.email, customerEmail(data)));
  const ops = data.livemode
    ? (process.env.SHOP_OPS_EMAIL || 'contact@balloonia.events').trim()
    : (process.env.SHOP_TEST_OPS_EMAIL || '').trim();
  if (ops) tasks.push(sendEmail(ops, opsEmail(data, uploadLinks), data.email || undefined));
  if (data.livemode) tasks.push(telegram(data));
  const settled = await Promise.allSettled(tasks);
  settled.forEach((r) => r.status === 'rejected' && console.error('notify failed', String(r.reason)));
  if (settled.every((r) => r.status === 'fulfilled')) {
    await sbUpdate('orders', `id=eq.${full.id}`, { emails_sent_at: new Date().toISOString() });
  }
  return { number: full.number };
}

async function telegram(o: OrderForEmail): Promise<void> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chats = [...new Set([process.env.BRENDA_CHAT_ID, process.env.DH_CHAT_ID].map((v) => v?.trim()).filter(Boolean))] as string[];
  if (!token || !chats.length) return;
  const text = [
    `🛍️ New shop order #${o.number} · ${cad(o.total)}`,
    `${o.name || ''}${o.phone ? ` · ${o.phone}` : ''}`,
    o.deliveryLabel ? `${o.deliveryLabel}${o.deliveryKm != null ? ` (about ${o.deliveryKm} km)` : ''}` : '',
    o.deliveryWarning ? `⚠️ ${o.deliveryWarning}` : '',
    ...o.items.map(
      (it) => `• ${it.title} × ${it.quantity}${it.selections.length ? ` (${it.selections.map((s) => s.value).join(', ')})` : ''}`,
    ),
    o.note ? `Note: ${o.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  await Promise.all(
    chats.map((chat_id) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text, disable_web_page_preview: true }),
      }),
    ),
  );
}
