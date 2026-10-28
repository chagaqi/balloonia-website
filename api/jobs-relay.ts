// POST /api/jobs-relay - the dashboard's Jobs hub borrows two things this site already has:
// Telegram pings to DH and Brenda, and Stripe card links for job invoices. The bot token,
// the chat ids and the Stripe key stay here. The dashboard Worker only signs with the
// JOBS_INTAKE_SECRET both sides already share for /api/jobs-intake. Recipients are fixed
// (dh, brenda, all) and photos must be our own colour cards, so the secret can't be used
// to message anyone else.
//
//   { op: 'telegram', to: 'dh' | 'brenda' | 'all', text?, photos?, caption? }
//   { op: 'paylink', recordId, number, client?, which: 'deposit' | 'balance', amount }   (amount in cents)
//
// The card link is the same one-use Payment Link the Worker would make (api/_job-pay.js in
// the marketing repo): its metadata (balloonia_job, which) brings the payment back through
// api/stripe-webhook.ts.
//
// Env (Vercel): JOBS_INTAKE_SECRET, TELEGRAM_BOT_TOKEN, DH_CHAT_ID, BRENDA_CHAT_ID, STRIPE_SECRET_KEY.

import { stripe } from '../src/lib/shop/server';

export const config = { runtime: 'edge' };

type Body = Record<string, unknown>;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const secret = (process.env.JOBS_INTAKE_SECRET || '').trim();
  if (!secret) return json({ error: 'relay_off' }, 503);
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!auth || !(await sameSecret(auth, secret))) return json({ error: 'unauthorized' }, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ error: 'invalid_json' }, 400);

  try {
    if (body.op === 'telegram') return await telegram(body);
    if (body.op === 'paylink') return await paylink(body);
    return json({ error: 'unknown_op' }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('jobs relay', body.op, message);
    return json({ error: 'relay_failed', message }, 502);
  }
}

function chats(to: unknown): string[] {
  const dh = (process.env.DH_CHAT_ID || '').trim();
  const brenda = (process.env.BRENDA_CHAT_ID || '').trim();
  const list = to === 'dh' ? [dh] : to === 'brenda' ? [brenda] : [dh, brenda];
  return [...new Set(list.filter(Boolean))];
}

const SWATCH = /^https:\/\/balloonia\.events\/swatches\/[a-z0-9-]+\.jpg$/;

async function telegram(b: Body): Promise<Response> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const ids = chats(b.to);
  if (!token || !ids.length) return json({ ok: false, skipped: 'telegram not configured' });
  const text = typeof b.text === 'string' ? b.text.slice(0, 4000) : '';
  const photos = (Array.isArray(b.photos) ? b.photos : [])
    .filter((u): u is string => typeof u === 'string' && SWATCH.test(u))
    .slice(0, 10);
  const caption = typeof b.caption === 'string' ? b.caption.slice(0, 1000) : undefined;
  if (!text && !photos.length) return json({ error: 'nothing_to_send' }, 400);

  const send = async (method: string, payload: Record<string, unknown>) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) console.error('jobs relay telegram', method, r.status, (await r.text()).slice(0, 300));
    return r.ok;
  };
  // Plain text only: Telegram's Markdown parser rejects a whole message over one stray
  // underscore in a client's name.
  const results = await Promise.all(
    ids.map(async (chat_id) => {
      if (text) return send('sendMessage', { chat_id, text, disable_web_page_preview: true });
      if (photos.length === 1) return send('sendPhoto', { chat_id, photo: photos[0], caption });
      return send('sendMediaGroup', {
        chat_id,
        media: photos.map((media, i) => ({ type: 'photo', media, ...(i === 0 && caption ? { caption } : {}) })),
      });
    }),
  );
  return json({ ok: results.some(Boolean) });
}

async function paylink(b: Body): Promise<Response> {
  if (!(process.env.STRIPE_SECRET_KEY || '').trim()) return json({ ok: false, skipped: 'stripe not configured' });
  const recordId = String(b.recordId || '');
  const number = String(b.number || '').slice(0, 20);
  const which = b.which === 'deposit' || b.which === 'balance' ? b.which : '';
  const amount = Number(b.amount);
  // $0.50 is Stripe's floor; $20,000 is far past the biggest install.
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId) || !which || !Number.isInteger(amount) || amount < 50 || amount > 2_000_000) {
    return json({ error: 'bad_request' }, 400);
  }
  const client = typeof b.client === 'string' ? b.client.slice(0, 80) : '';

  const product = await stripe<{ default_price: string }>('POST', 'products', {
    name: `${number} ${which}${client ? ` · ${client}` : ''}`.slice(0, 250),
    default_price_data: { currency: 'cad', unit_amount: amount },
    metadata: { balloonia_job: recordId },
  });
  const link = await stripe<{ url: string }>('POST', 'payment_links', {
    line_items: [{ price: product.default_price, quantity: 1 }],
    metadata: { balloonia_job: recordId, which, number },
    payment_intent_data: { metadata: { balloonia_job: recordId, which } },
    restrictions: { completed_sessions: { limit: 1 } },
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: { custom_message: 'Thank you! Balloonia Events has your payment. A receipt is on its way.' },
    },
  });
  return json({ ok: true, url: link.url });
}

async function sameSecret(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const ax = new Uint8Array(x);
  const by = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < ax.length; i++) d |= ax[i] ^ by[i];
  return d === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
