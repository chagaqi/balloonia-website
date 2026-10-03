// Server-side shop helpers for the /api functions (Vercel edge runtime): Supabase
// REST, Stripe REST, webhook signature checks, and the cart re-pricing that makes
// the server the only source of truth for what a customer pays.

import type { OptionSet, Selection } from './types';
import { addonCents, cents, fromCents, toSelections, validate, valuesFromSelections, isVisible } from './price';

// ---------- env ----------
export function env(name: string): string {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

// ---------- Supabase ----------
function sbBase() {
  return env('SUPABASE_URL').replace(/\/$/, '');
}
function sbHeaders(extra: Record<string, string> = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function sbSelect<T = any>(path: string): Promise<T[]> {
  const res = await fetch(`${sbBase()}/rest/v1/${path}`, { headers: sbHeaders({ Accept: 'application/json' }) });
  if (!res.ok) throw new Error(`supabase select ${path.split('?')[0]} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function sbInsert<T = any>(table: string, rows: unknown, prefer = 'return=representation'): Promise<T[]> {
  const res = await fetch(`${sbBase()}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: prefer }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = new Error(`supabase insert ${table} ${res.status}: ${await res.text()}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return prefer.includes('representation') ? res.json() : [];
}

export async function sbUpdate(table: string, filter: string, patch: unknown): Promise<void> {
  const res = await fetch(`${sbBase()}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`supabase update ${table} ${res.status}: ${await res.text()}`);
}

export function storageUrl(path: string) {
  return `${sbBase()}/storage/v1/${path}`;
}

export async function storagePost(path: string, body: unknown): Promise<any> {
  const res = await fetch(storageUrl(path), {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`storage ${path.split('/').slice(0, 3).join('/')} ${res.status}: ${await res.text()}`);
  return res.json();
}

export function publicImage(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  return `${sbBase()}/storage/v1/object/public/product-images/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function getSetting<T = any>(key: string): Promise<T | null> {
  const rows = await sbSelect<{ value: T }>(`settings?key=eq.${encodeURIComponent(key)}&select=value`);
  return rows[0]?.value ?? null;
}

// ---------- Stripe ----------
function formEncode(obj: unknown, prefix = '', out: string[] = []): string[] {
  if (obj === undefined || obj === null) return out;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  } else if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
    }
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(obj))}`);
  }
  return out;
}

export async function stripe<T = any>(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
    'Stripe-Version': '2024-06-20',
  };
  let url = `https://api.stripe.com/v1/${path}`;
  let payload: string | undefined;
  if (body !== undefined) {
    const encoded = formEncode(body).join('&');
    if (method === 'GET') url += (url.includes('?') ? '&' : '?') + encoded;
    else {
      payload = encoded;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(url, { method, headers, body: payload });
  const data = (await res.json()) as any;
  if (!res.ok) {
    const err = new Error(`stripe ${path.split('?')[0]} ${res.status}: ${data?.error?.message || 'error'}`) as Error & { stripe?: any };
    err.stripe = data?.error;
    throw err;
  }
  return data as T;
}

// HST 13% (Ontario) as a Stripe tax rate, found or created once per key/mode.
let hstRate: Promise<string> | null = null;
export function hstTaxRateId(rate = 0.13, label = 'HST'): Promise<string> {
  if (!hstRate) {
    hstRate = (async () => {
      const pct = Math.round(rate * 10000) / 100;
      const list = await stripe<{ data: any[] }>('GET', 'tax_rates?active=true&limit=100');
      const found = list.data.find(
        (t) => t.display_name === label && Number(t.percentage) === pct && !t.inclusive && t.metadata?.balloonia === 'hst',
      );
      if (found) return found.id as string;
      const created = await stripe<{ id: string }>(
        'POST',
        'tax_rates',
        {
          display_name: label,
          description: `Ontario HST ${pct}%`,
          percentage: pct,
          inclusive: false,
          country: 'CA',
          state: 'ON',
          jurisdiction: 'Ontario',
          tax_type: 'hst',
          metadata: { balloonia: 'hst' },
        },
        `balloonia-hst-${pct}`,
      );
      return created.id;
    })();
    hstRate.catch(() => {
      hstRate = null;
    });
  }
  return hstRate;
}

// Stripe-Signature: t=<ts>,v1=<hex hmac of "<ts>.<raw body>">
export async function verifyStripeSignature(raw: string, header: string | null, secret: string, toleranceSec = 300): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  const sigs = header
    .split(',')
    .filter((kv) => kv.trim().startsWith('v1='))
    .map((kv) => kv.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return sigs.some((s) => timingSafeEqual(s, hex));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- cart re-pricing ----------
export type IncomingLine = {
  productId: number;
  variantId: number;
  quantity: number;
  selections?: Selection[];
};

export type PricedLine = {
  productId: number;
  variantId: number;
  handle: string;
  title: string;
  variantTitle: string | null;
  image: string | null;
  quantity: number;
  basePrice: number;
  addons: number;
  unitPrice: number;
  lineTotal: number;
  selections: Selection[];
  uploads: string[];
  setKey: string | null;
  productType: string;
};

export class CartError extends Error {}

const UPLOAD_PATH = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpe?g|png)$/;

export async function priceCart(lines: IncomingLine[]): Promise<PricedLine[]> {
  if (!Array.isArray(lines) || lines.length === 0) throw new CartError('Your cart is empty.');
  if (lines.length > 50) throw new CartError('Too many lines in the cart.');
  const ids = [...new Set(lines.map((l) => Number(l.productId)).filter((n) => Number.isFinite(n)))];
  if (!ids.length) throw new CartError('Your cart is empty.');
  const products = await sbSelect(
    `products?id=in.(${ids.join(',')})&select=id,handle,title,status,product_type,product_images(position,storage_path),variants(id,title,price,available),product_options(name,position,values),product_option_sets(option_sets(key,name,definition,active))`,
  );
  const byId = new Map(products.map((p: any) => [Number(p.id), p]));
  const out: PricedLine[] = [];
  for (const line of lines) {
    const p: any = byId.get(Number(line.productId));
    if (!p || p.status !== 'active') throw new CartError('An item in your cart is no longer available. Please remove it and try again.');
    const v = (p.variants as any[]).find((x) => Number(x.id) === Number(line.variantId));
    if (!v) throw new CartError(`${p.title}: that option is no longer available. Please remove it and add it again.`);
    if (v.available === false) throw new CartError(`${p.title} is sold out.`);
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) throw new CartError(`${p.title}: quantity must be between 1 and 99.`);
    const setRow = (p.product_option_sets as any[]).map((r) => r.option_sets).find((s: any) => s && s.active);
    const set: OptionSet | null = setRow ? { key: setRow.key, name: setRow.name, fields: setRow.definition.fields } : null;
    const incoming = Array.isArray(line.selections) ? line.selections : [];
    const fieldIds = new Set((set?.fields ?? []).map((f) => f.id));
    const unknown = incoming.filter((s) => !fieldIds.has(s.id));
    if (unknown.length) throw new CartError(`${p.title}: the options have changed since you added it. Please remove it and add it again.`);
    const values = valuesFromSelections(incoming);
    const errors = validate(set, values);
    if (Object.keys(errors).length) {
      const f = set!.fields.find((x) => errors[x.id])!;
      throw new CartError(`${p.title}: ${f.label} - ${errors[f.id]}`);
    }
    // Drop anything sent for a field that is hidden by its condition.
    if (set) for (const f of set.fields) if (!isVisible(f, values, set.fields)) delete values[f.id];
    const selections = toSelections(set, values);
    const uploads = selections.filter((s) => s.upload).map((s) => s.upload!.path);
    for (const u of uploads) if (!UPLOAD_PATH.test(u)) throw new CartError(`${p.title}: please upload your file again.`);
    const add = addonCents(set, values);
    const unit = cents(Number(v.price)) + add;
    const axes = (p.product_options as any[]).filter((o) => !(o.values?.length === 1 && o.values[0] === 'Default Title'));
    const img = (p.product_images as any[]).sort((a, b) => a.position - b.position)[0];
    out.push({
      productId: Number(p.id),
      variantId: Number(v.id),
      handle: p.handle,
      title: p.title,
      variantTitle: axes.length ? v.title : null,
      image: publicImage(img?.storage_path),
      quantity: qty,
      basePrice: Number(v.price),
      addons: fromCents(add),
      unitPrice: fromCents(unit),
      lineTotal: fromCents(unit * qty),
      selections,
      uploads,
      setKey: set?.key ?? null,
      productType: p.product_type || '',
    });
  }
  return out;
}

export function describeSelections(line: Pick<PricedLine, 'variantTitle' | 'selections'>): string {
  const parts: string[] = [];
  if (line.variantTitle) parts.push(line.variantTitle);
  for (const s of line.selections) parts.push(`${s.label}: ${s.value}`);
  return parts.join(' · ');
}

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function cad(n: number): string {
  return '$' + new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

// ---------- delivery zone check ----------
export type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocode(params: Record<string, string>): Promise<{ lat: number; lon: number } | null> {
  const qs = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'ca', ...params });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
      headers: { 'User-Agent': 'BallooniaShop/1.0 (contact@balloonia.events)', Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    return rows[0] ? { lat: Number(rows[0].lat), lon: Number(rows[0].lon) } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Straight-line km from the shop to a delivery address (street first, then the town).
// Null when the address cannot be found; the order still goes through.
export async function distanceFromShopKm(addr: ShippingAddress | null | undefined, origin: { lat: number; lon: number }): Promise<number | null> {
  if (!addr) return null;
  const street = [addr.line1].filter(Boolean).join(' ');
  const point =
    (street && addr.city ? await geocode({ street, city: addr.city, state: addr.state || 'ON' }) : null) ||
    (addr.city ? await geocode({ city: addr.city, state: addr.state || 'ON' }) : null);
  if (!point) return null;
  return Math.round(haversineKm(origin, point) * 10) / 10;
}

// Plain-language warning for the ops email when the chosen delivery band and the
// address do not agree. Straight-line distance runs a little under road distance,
// so the free zone gets a small allowance before it flags.
export function deliveryZoneWarning(
  deliveryId: string | null,
  km: number | null,
  options: { id: string; min_km?: number; max_km?: number; amount: number | null }[],
): string | null {
  if (km == null || !deliveryId || deliveryId === 'pickup') return null;
  const free = options.find((o) => o.id === 'london');
  const far = options.find((o) => o.id === 'extended');
  const freeMax = free?.max_km ?? 30;
  const farMax = far?.max_km ?? 250;
  if (km > farMax) return `The address is about ${km} km from the shop, past the ${farMax} km delivery area. Call the customer before planning this one.`;
  if (deliveryId === 'london' && km > freeMax + 3)
    return `The address is about ${km} km from the shop, outside the free zone. Delivery there is $${far?.amount ?? 75}. Collect it or confirm with the customer.`;
  if (deliveryId === 'extended' && km < freeMax - 3)
    return `The address is about ${km} km from the shop, inside the free zone, but the customer paid $${far?.amount ?? 75} for delivery. Refund the delivery charge.`;
  return null;
}
