// Main-site catalog API (home page features, services page product rows).
// Reads the shop catalog from Supabase at build time (src/lib/shop/catalog.ts)
// and maps it to the small Product shape these pages were built around.

import { getCatalog, plainText, type ShopProduct } from '../../lib/shop/catalog';
import type { Product, ProductCategory } from './types';

function mapCategory(productType: string): ProductCategory {
  const t = productType.toLowerCase().trim();
  if (t === 'arch' || t === 'arches' || t === 'garland' || t === 'garlands') return 'arches';
  if (t === 'wall' || t === 'walls' || t === 'backdrop' || t === 'backdrops') return 'walls';
  if (t === 'centerpiece' || t === 'centerpieces' || t === 'bouquet' || t === 'bouquets') return 'centerpieces';
  if (t === 'column' || t === 'columns' || t === 'number' || t === 'numbers' || t === 'letter' || t === 'letters') return 'columns';
  if (t === 'ceiling' || t === 'ceilings') return 'ceiling';
  if (t === 'photo-booth' || t === 'photo booth' || t === 'photobooth') return 'photo-booth';
  if (t === 'shower' || t === 'showers') return 'showers';
  if (t === 'wedding' || t === 'weddings') return 'weddings';
  if (t === 'corporate') return 'corporate';
  return 'custom';
}

function toProduct(p: ShopProduct): Product {
  const img = p.images[0];
  return {
    id: String(p.id),
    handle: p.handle,
    title: p.title,
    description: plainText(p.bodyHtml),
    category: mapCategory(p.type),
    startingPrice: Math.round(p.minPrice),
    image: {
      src: img?.src ?? `/images/products/${p.handle}.svg`,
      alt: img?.alt ?? p.title,
    },
    tags: p.tags,
  };
}

async function all(): Promise<Product[]> {
  const catalog = await getCatalog();
  return catalog.products.map(toProduct);
}

export async function getAllProducts(): Promise<Product[]> {
  return all();
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return (await all()).filter((p) => p.tags.includes('featured-home'));
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  return (await all()).filter((p) => p.category === category);
}

export async function getProductsByTag(tag: string): Promise<Product[]> {
  return (await all()).filter((p) => p.tags.includes(tag));
}

export function shopUrlFor(handle: string): string {
  return `/products/${handle}`;
}
