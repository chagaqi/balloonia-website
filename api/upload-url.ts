// POST /api/upload-url  { filename, contentType, size }
// Hands the product page a one-time signed URL to PUT a customer file (logo/design)
// straight into the private Supabase bucket "customer-uploads". jpeg/jpg/png, 10 MB max
// (the bucket enforces the size too). Returns { uploadUrl, path }.

import { json, storagePost, storageUrl } from '../src/lib/shop/server';

export const config = { runtime: 'edge' };

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const MAX = 10 * 1024 * 1024;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  const ext = String(body.filename || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (!ext || !TYPES[ext]) return json({ error: 'Allowed file types: jpeg, jpg, png' }, 400);
  const size = Number(body.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX) return json({ error: 'The file is larger than 10 MB' }, 400);

  const month = new Date().toISOString().slice(0, 7);
  const path = `${month}/${crypto.randomUUID()}.${ext}`;
  try {
    const signed = await storagePost(`object/upload/sign/customer-uploads/${path}`, {});
    const rel: string = signed.url || signed.signedURL;
    if (!rel) throw new Error('no signed url');
    return json({ uploadUrl: storageUrl(rel.replace(/^\/+/, '')), path });
  } catch (err) {
    console.error('upload-url failed', err instanceof Error ? err.message : err);
    return json({ error: 'Upload is unavailable right now' }, 500);
  }
}
