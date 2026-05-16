/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_ZAPIER_WEBHOOK: string;
  readonly PUBLIC_HONEYBOOK_SCHEDULER: string;
  readonly PUBLIC_PHONE: string;
  readonly PUBLIC_SUBMIT_MODE: 'mock' | 'live';
  readonly SHOPIFY_STORE_DOMAIN: string;
  readonly SHOPIFY_STOREFRONT_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
