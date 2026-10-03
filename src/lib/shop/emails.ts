// Order emails (Resend). Customer confirmation + ops copy with upload links.

import { cad, escapeHtml } from './server';

export type OrderForEmail = {
  number: number;
  email: string | null;
  name: string | null;
  phone: string | null;
  deliveryLabel: string | null;
  shipping: { name?: string; address?: Record<string, string | null> } | null;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  promoCode: string | null;
  note: string | null;
  livemode: boolean;
  paymentIntent: string | null;
  items: {
    title: string;
    handle: string;
    variantTitle: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    selections: { label: string; value: string; price: number; upload?: { path: string; name: string } }[];
  }[];
};

const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const LINE = '#e7e1d6';

function address(o: OrderForEmail): string {
  const a = o.shipping?.address;
  if (!a) return '';
  return [o.shipping?.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(' '), a.country]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join('<br>');
}

function itemsTable(o: OrderForEmail, uploadLinks: Record<string, string> = {}): string {
  return o.items
    .map((it) => {
      const props = [
        ...(it.variantTitle ? [`<div>${escapeHtml(it.variantTitle)}</div>`] : []),
        ...it.selections.map((s) => {
          const link = s.upload && uploadLinks[s.upload.path];
          const value = link ? `<a href="${escapeHtml(link)}" style="color:${INK}">${escapeHtml(s.value)}</a>` : escapeHtml(s.value);
          return `<div>${escapeHtml(s.label)}: ${value}${s.price > 0 ? ` (+ ${cad(s.price)})` : ''}</div>`;
        }),
      ].join('');
      return `<tr>
  <td style="padding:14px 0;border-bottom:1px solid ${LINE};vertical-align:top">
    <div style="font-family:Georgia,serif;font-size:17px;color:${INK}">${escapeHtml(it.title)} &times; ${it.quantity}</div>
    <div style="font-size:13px;line-height:20px;color:${MUTED};margin-top:4px">${props}</div>
  </td>
  <td style="padding:14px 0;border-bottom:1px solid ${LINE};vertical-align:top;text-align:right;white-space:nowrap;color:${INK}">${cad(it.lineTotal)}</td>
</tr>`;
    })
    .join('');
}

function totals(o: OrderForEmail): string {
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;color:${strong ? INK : MUTED};${strong ? 'font-weight:600;' : ''}">${label}</td><td style="padding:4px 0;text-align:right;color:${INK};${strong ? 'font-weight:600;' : ''}">${value}</td></tr>`;
  return [
    row('Subtotal', cad(o.subtotal)),
    o.discountTotal > 0 ? row(`Discount${o.promoCode ? ` (${escapeHtml(o.promoCode)})` : ''}`, `- ${cad(o.discountTotal)}`) : '',
    row(o.deliveryLabel ? escapeHtml(o.deliveryLabel) : 'Delivery', o.shippingTotal > 0 ? cad(o.shippingTotal) : 'Free'),
    row('HST', cad(o.taxTotal)),
    row('Total', `${cad(o.total)} CAD`, true),
  ].join('');
}

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fbf9f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK}">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="font-family:Georgia,serif;font-size:22px;margin-bottom:24px">Balloonia Events</div>
${inner}
<p style="margin-top:32px;font-size:12px;color:${MUTED}">Balloonia Events &middot; 412 Newbold St, Unit 4, London, ON N6E 1K1 &middot; 226-242-2244</p>
</div></body></html>`;
}

export function customerEmail(o: OrderForEmail): { subject: string; html: string; text: string } {
  const html = shell(`
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 8px">Order #${o.number} confirmed</h1>
<p style="font-size:15px;line-height:24px;margin:0 0 20px">Thanks${o.name ? `, ${escapeHtml(o.name.split(' ')[0])}` : ''}. We have your order and will text you within 24 hours to confirm your ${o.deliveryLabel && /pickup/i.test(o.deliveryLabel) ? 'pickup' : 'delivery'} window.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${itemsTable(o)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin-top:12px">${totals(o)}</table>
${address(o) ? `<p style="font-size:14px;line-height:21px;margin:24px 0 0"><strong>${o.deliveryLabel && /pickup/i.test(o.deliveryLabel) ? 'Contact address' : 'Delivery address'}</strong><br>${address(o)}</p>` : ''}
${o.deliveryLabel && /pickup/i.test(o.deliveryLabel) ? `<p style="font-size:14px;line-height:21px;margin:16px 0 0"><strong>Pickup</strong><br>412 Newbold St, Unit 4, London, ON N6E 1K1</p>` : ''}
${o.note ? `<p style="font-size:14px;line-height:21px;margin:16px 0 0"><strong>Your note</strong><br>${escapeHtml(o.note)}</p>` : ''}
<p style="font-size:14px;line-height:21px;margin:24px 0 0">Questions or changes? Reply to this email or text 226-242-2244.</p>`);
  const text = [
    `Order #${o.number} confirmed`,
    '',
    'We have your order and will text you within 24 hours to confirm the window.',
    '',
    ...o.items.map(
      (it) =>
        `${it.title} x ${it.quantity}  ${cad(it.lineTotal)}\n` +
        [it.variantTitle, ...it.selections.map((s) => `${s.label}: ${s.value}`)].filter(Boolean).map((x) => `  ${x}`).join('\n'),
    ),
    '',
    `Subtotal ${cad(o.subtotal)}`,
    o.discountTotal > 0 ? `Discount -${cad(o.discountTotal)}` : '',
    `${o.deliveryLabel || 'Delivery'} ${o.shippingTotal > 0 ? cad(o.shippingTotal) : 'Free'}`,
    `HST ${cad(o.taxTotal)}`,
    `Total ${cad(o.total)} CAD`,
    '',
    'Questions or changes? Reply to this email or text 226-242-2244.',
  ]
    .filter((l) => l !== '')
    .join('\n');
  return { subject: `Order #${o.number} confirmed`, html, text };
}

export function opsEmail(o: OrderForEmail, uploadLinks: Record<string, string>): { subject: string; html: string; text: string } {
  const dash = o.paymentIntent ? `https://dashboard.stripe.com/${o.livemode ? '' : 'test/'}payments/${o.paymentIntent}` : '';
  const html = shell(`
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 8px">${o.livemode ? '' : '[TEST] '}New order #${o.number} &middot; ${cad(o.total)}</h1>
<p style="font-size:14px;line-height:22px;margin:0 0 16px">
<strong>${escapeHtml(o.name || 'No name')}</strong><br>
${o.email ? `<a href="mailto:${escapeHtml(o.email)}" style="color:${INK}">${escapeHtml(o.email)}</a><br>` : ''}
${o.phone ? `<a href="tel:${escapeHtml(o.phone)}" style="color:${INK}">${escapeHtml(o.phone)}</a><br>` : ''}
${escapeHtml(o.deliveryLabel || 'Delivery method not recorded')}
</p>
${address(o) ? `<p style="font-size:14px;line-height:21px;margin:0 0 16px">${address(o)}</p>` : ''}
${o.note ? `<p style="font-size:14px;line-height:21px;margin:0 0 16px;padding:10px 12px;background:#fff;border:1px solid ${LINE};border-radius:8px"><strong>Order note:</strong> ${escapeHtml(o.note)}</p>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${itemsTable(o, uploadLinks)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin-top:12px">${totals(o)}</table>
${Object.keys(uploadLinks).length ? `<p style="font-size:12px;color:${MUTED};margin:16px 0 0">Upload links work for 7 days. The files stay in Supabase Storage (bucket customer-uploads).</p>` : ''}
${dash ? `<p style="font-size:13px;margin:16px 0 0"><a href="${dash}" style="color:${INK}">Open the payment in Stripe</a></p>` : ''}`);
  const text = `${o.livemode ? '' : '[TEST] '}New order #${o.number} ${cad(o.total)}\n${o.name || ''} ${o.email || ''} ${o.phone || ''}\n${o.deliveryLabel || ''}\n\n${o.items
    .map((it) => `${it.title} x ${it.quantity}: ${[it.variantTitle, ...it.selections.map((s) => `${s.label}: ${s.value}`)].filter(Boolean).join('; ')}`)
    .join('\n')}${o.note ? `\n\nNote: ${o.note}` : ''}`;
  return { subject: `${o.livemode ? '' : '[TEST] '}New order #${o.number} · ${cad(o.total)} · ${o.name || o.email || 'customer'}`, html, text };
}

export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }, replyTo?: string): Promise<void> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Balloonia Events <noreply@mail.balloonia.events>',
      to: [to],
      reply_to: replyTo || 'contact@balloonia.events',
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}
