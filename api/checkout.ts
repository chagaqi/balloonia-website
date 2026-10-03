// POST /api/checkout
// Body: { items: [{ productId, variantId, quantity, selections }], note }
// Re-prices every line from Supabase (the browser's prices are never trusted), saves
// the cart, and opens a Stripe Checkout Session. Returns { url } for the redirect.
//
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import {
  CartError,
  describeSelections,
  getSetting,
  hstTaxRateId,
  json,
  priceCart,
  sbInsert,
  sbUpdate,
  stripe,
  type IncomingLine,
} from '../src/lib/shop/server';

export const config = { runtime: 'edge' };

type DeliveryOption = { id: string; label: string; amount: number | null };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { items?: IncomingLine[]; note?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  try {
    const lines = await priceCart(body.items ?? []);
    const note = String(body.note ?? '').slice(0, 1000);
    const subtotal = lines.reduce((s, l) => s + Math.round(l.lineTotal * 100), 0) / 100;

    const [tax, delivery] = await Promise.all([
      getSetting<{ rate: number; label: string; inclusive: boolean }>('tax'),
      getSetting<{ options: DeliveryOption[] }>('delivery'),
    ]);
    const taxRateId = await hstTaxRateId(tax?.rate ?? 0.13, tax?.label ?? 'HST');

    // Delivery choices. An option with no amount yet (rates not entered) is never offered.
    // Decision 4: a cart of rentals only already carries Pickup/Delivery (+$20) on each
    // line, so it gets Pickup only and delivery is never charged twice.
    const rentalsOnly = lines.every((l) => l.setKey === 'rentals');
    const options = (delivery?.options ?? [{ id: 'pickup', label: 'Pickup', amount: 0 }]).filter(
      (o) => o.amount != null && (!rentalsOnly || o.id === 'pickup'),
    );

    const [cart] = await sbInsert('carts', {
      items: lines,
      subtotal,
      note: note || null,
    });

    const origin = new URL(req.url).origin;
    const session = await stripe<{ id: string; url: string }>(
      'POST',
      'checkout/sessions',
      {
        mode: 'payment',
        currency: 'cad',
        line_items: lines.map((l) => ({
          quantity: l.quantity,
          tax_rates: [taxRateId],
          price_data: {
            currency: 'cad',
            unit_amount: Math.round(l.unitPrice * 100),
            tax_behavior: 'exclusive',
            product_data: {
              name: l.title,
              description: describeSelections(l).slice(0, 480) || undefined,
              images: l.image ? [l.image] : undefined,
              metadata: { product_id: String(l.productId), variant_id: String(l.variantId), handle: l.handle },
            },
          },
        })),
        shipping_options: options.slice(0, 5).map((o) => ({
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: o.label,
            fixed_amount: { amount: Math.round((o.amount ?? 0) * 100), currency: 'cad' },
            metadata: { delivery_id: o.id },
          },
        })),
        shipping_address_collection: { allowed_countries: ['CA'] },
        phone_number_collection: { enabled: true },
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        metadata: { cart_id: cart.id },
        payment_intent_data: {
          metadata: { cart_id: cart.id },
          description: `Balloonia Events order (cart ${cart.id.slice(0, 8)})`,
        },
        custom_text: {
          submit: { message: 'We will text you within 24 hours to confirm your delivery or pickup window.' },
        },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart`,
      },
      `checkout-${cart.id}`,
    );

    await sbUpdate('carts', `id=eq.${cart.id}`, { stripe_session_id: session.id });
    return json({ url: session.url });
  } catch (err) {
    if (err instanceof CartError) return json({ error: err.message }, 400);
    console.error('checkout failed', err instanceof Error ? err.message : err);
    return json(
      { error: 'Checkout is unavailable right now. Please try again, or call 226-242-2244 and we will take your order by phone.' },
      500,
    );
  }
}
