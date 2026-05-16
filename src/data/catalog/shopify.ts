// Catalog fetcher. Build-time only.
//
// When SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN are set, fetches the
// live catalog via the Storefront GraphQL API. Otherwise falls back to the
// local mock products.json so dev without creds still works.
//
// Astro frontmatter runs in Node during SSG, so the token never ships to the
// browser. Catalog refresh requires a redeploy. Webhook-driven rebuilds are a
// future addition.

import productsJson from './products.json';
import type { Product, ProductCategory } from './types';

const STORE_DOMAIN = import.meta.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = import.meta.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = '2026-04';

const PRODUCTS_QUERY = `
query Products($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      cursor
      node {
        id
        handle
        title
        description
        productType
        tags
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
        totalInventory
      }
    }
  }
}
`;

type ShopifyImage = { url: string; altText: string | null; width: number; height: number } | null;
type ShopifyProductNode = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  featuredImage: ShopifyImage;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  totalInventory: number | null;
};

type ProductsResponse = {
  data?: {
    products: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: { cursor: string; node: ShopifyProductNode }[];
    };
  };
  errors?: { message: string }[];
};

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

function toProduct(node: ShopifyProductNode): Product {
  const numericId = node.id.split('/').pop() ?? node.id;
  const fallbackImage = `/images/products/${node.handle}.svg`;
  return {
    id: numericId,
    handle: node.handle,
    title: node.title,
    description: node.description || '',
    category: mapCategory(node.productType),
    startingPrice: Math.round(Number.parseFloat(node.priceRange.minVariantPrice.amount)),
    image: {
      src: node.featuredImage?.url ?? fallbackImage,
      alt: node.featuredImage?.altText ?? node.title,
    },
    tags: node.tags,
  };
}

let cache: Promise<Product[]> | null = null;

async function fetchAllFromShopify(): Promise<Product[]> {
  const endpoint = `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`;
  const all: Product[] = [];
  let after: string | null = null;
  let pages = 0;

  while (true) {
    pages++;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first: 250, after } }),
    });
    if (!res.ok) {
      throw new Error(`Shopify Storefront returned ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as ProductsResponse;
    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
    }
    const block = json.data?.products;
    if (!block) break;
    for (const edge of block.edges) {
      all.push(toProduct(edge.node));
    }
    if (!block.pageInfo.hasNextPage) break;
    after = block.pageInfo.endCursor;
    if (pages > 10) break;
  }

  // eslint-disable-next-line no-console
  console.log(`[shopify] fetched ${all.length} products in ${pages} page(s)`);
  return all;
}

function getCatalog(): Promise<Product[]> {
  if (cache) return cache;
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn('[shopify] env not set, using mock catalog');
    cache = Promise.resolve(productsJson as Product[]);
    return cache;
  }
  cache = fetchAllFromShopify().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[shopify] fetch failed, falling back to mock:', err instanceof Error ? err.message : err);
    return productsJson as Product[];
  });
  return cache;
}

export async function getAllProducts(): Promise<Product[]> {
  return getCatalog();
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getCatalog();
  return products.filter((p) => p.tags.includes('featured-home'));
}

export async function getProductsByCategory(category: ProductCategory): Promise<Product[]> {
  const products = await getCatalog();
  return products.filter((p) => p.category === category);
}

export async function getProductsByTag(tag: string): Promise<Product[]> {
  const products = await getCatalog();
  return products.filter((p) => p.tags.includes(tag));
}

export function shopUrlFor(handle: string): string {
  return `https://shop.balloonia.events/products/${handle}`;
}
