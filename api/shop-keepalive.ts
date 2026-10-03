// GET /api/shop-keepalive (Vercel cron, daily). Supabase pauses free projects after a
// week without traffic; a paused project would break checkout and the next build.
// One tiny read a day keeps it awake.

import { json, sbSelect } from '../src/lib/shop/server';

export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  try {
    const rows = await sbSelect('settings?select=key&limit=1');
    return json({ ok: true, rows: rows.length });
  } catch (err) {
    console.error('keepalive failed', err instanceof Error ? err.message : err);
    return json({ ok: false }, 500);
  }
}
