// Build-time catalog loader. Reads the store from Supabase once per build (the
// promise is cached for the whole `astro build`), so every page shares one fetch.
// The service-role key is only ever used here and in /api, never in the browser.

import type { OptionSet } from './types';

export type ShopImage = {
  id: number;
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
};

export type ShopVariant = {
  id: number;
  title: string;
  options: string[];
  price: number;
  compareAt: number | null;
  available: boolean;
  imageId: number | null;
};

export type ShopProduct = {
  id: number;
  handle: string;
  title: string;
  bodyHtml: string;
  type: string;
  vendor: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  position: number;
  createdAt: string;
  images: ShopImage[];
  variants: ShopVariant[];
  options: { name: string; values: string[] }[];
  optionSet: OptionSet | null;
  minPrice: number;
  maxPrice: number;
  priceVaries: boolean;
  compareAtMin: number | null;
  available: boolean;
};

export type ShopCollectionData = {
  id: number;
  handle: string;
  title: string;
  bodyHtml: string;
  productIds: number[];
};

export type ShopSettings = {
  archived_handles?: string[];
  pickup_address?: string;
  tax?: { rate: number; label: string; inclusive: boolean };
  [k: string]: unknown;
};

export type Catalog = {
  products: ShopProduct[];
  byHandle: Map<string, ShopProduct>;
  byId: Map<number, ShopProduct>;
  collections: ShopCollectionData[];
  settings: ShopSettings;
};

function env(name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'): string {
  const fromVite = name === 'SUPABASE_URL' ? import.meta.env.SUPABASE_URL : import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const v = fromVite || (typeof process !== 'undefined' ? process.env[name] : undefined);
  if (!v) throw new Error(`[shop] ${name} is not set. Add it to .env (local) or the Vercel project env.`);
  return v;
}

async function rest<T>(path: string): Promise<T> {
  const base = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${base}/rest/v1/${path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error(`[shop] Supabase read failed for ${path.split('?')[0]}: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

export function publicImageUrl(storagePath: string): string {
  return `${env('SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/public/product-images/${storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

type Row = Record<string, any>;

let cache: Promise<Catalog> | null = null;

async function load(): Promise<Catalog> {
  const [productRows, collectionRows, settingRows] = await Promise.all([
    rest<Row[]>(
      'products?status=eq.active&select=*,product_images(*),variants(*),product_options(*),product_option_sets(option_sets(key,name,definition,active))&order=position.asc.nullslast,title.asc',
    ),
    rest<Row[]>('collections?select=*,collection_products(product_id,position)&order=position.asc'),
    rest<Row[]>('settings?select=key,value'),
  ]);

  const products: ShopProduct[] = productRows.map((p, i) => {
    const images: ShopImage[] = (p.product_images as Row[])
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        id: Number(img.id),
        src: img.storage_path ? publicImageUrl(img.storage_path) : img.src,
        alt: img.alt || p.title,
        width: img.width || 1600,
        height: img.height || 1600,
        position: img.position,
      }));
    const variants: ShopVariant[] = (p.variants as Row[])
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: Number(v.id),
        title: v.title,
        options: [v.option1, v.option2, v.option3].filter((x) => x != null),
        price: Number(v.price),
        compareAt: v.compare_at_price != null && Number(v.compare_at_price) > Number(v.price) ? Number(v.compare_at_price) : null,
        available: v.available !== false,
        imageId: v.image_id != null ? Number(v.image_id) : null,
      }));
    const options = (p.product_options as Row[])
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ name: o.name as string, values: o.values as string[] }));
    const sets = (p.product_option_sets as Row[])
      .map((r) => r.option_sets)
      .filter((s: Row | null) => s && s.active);
    const optionSet: OptionSet | null = sets.length
      ? { key: sets[0].key, name: sets[0].name, fields: sets[0].definition.fields }
      : null;
    const prices = variants.map((v) => v.price);
    const compares = variants.map((v) => v.compareAt).filter((x): x is number => x != null);
    return {
      id: Number(p.id),
      handle: p.handle,
      title: p.title,
      bodyHtml: p.body_html || '',
      type: p.product_type || '',
      vendor: p.vendor || 'Balloonia Events',
      tags: p.tags || [],
      seoTitle: p.seo_title || '',
      seoDescription: p.seo_description || '',
      position: p.position ?? 1000 + i,
      createdAt: p.created_at,
      images,
      variants,
      options,
      optionSet,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      priceVaries: Math.min(...prices) !== Math.max(...prices),
      compareAtMin: compares.length ? Math.min(...compares) : null,
      available: variants.some((v) => v.available),
    };
  });

  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const byId = new Map(products.map((p) => [p.id, p]));
  const collections: ShopCollectionData[] = collectionRows.map((c) => ({
    id: Number(c.id),
    handle: c.handle,
    title: c.title,
    bodyHtml: c.body_html || '',
    productIds: (c.collection_products as Row[])
      .sort((a, b) => a.position - b.position)
      .map((cp) => Number(cp.product_id))
      .filter((id) => byId.has(id)),
  }));
  const settings: ShopSettings = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  // eslint-disable-next-line no-console
  console.log(`[shop] catalog: ${products.length} products, ${collections.length} collections`);
  return { products, byHandle, byId, collections, settings };
}

export function getCatalog(): Promise<Catalog> {
  if (!cache) cache = load();
  return cache;
}

export function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// "You may also like": the list Shopify showed for this product (copied by
// scripts/shop/recommendations.py), topped up with same product type first, then most
// shared tags, then catalog order.
export function related(catalog: Catalog, product: ShopProduct, n = 4): ShopProduct[] {
  const saved = ((catalog.settings.recommendations as Record<string, string[]> | undefined)?.[product.handle] ?? [])
    .map((h) => catalog.byHandle.get(h))
    .filter((p): p is ShopProduct => !!p && p.id !== product.id);
  if (saved.length >= n) return saved.slice(0, n);
  const seen = new Set(saved.map((p) => p.id));
  const tags = new Set(product.tags);
  return catalog.products
    .filter((p) => p.id !== product.id && !seen.has(p.id))
    .map((p) => ({
      p,
      score: (p.type && p.type === product.type ? 100 : 0) + p.tags.filter((t) => tags.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.position - b.p.position)
    .slice(0, n - saved.length)
    .map((x) => x.p)
    .reduce((acc, p) => [...acc, p], saved);
}
