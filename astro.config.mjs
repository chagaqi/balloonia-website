// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://balloonia.events',
  // The combined arches-and-garlands page was split into one page per search
  // intent. Arch and garland queries return different results with different
  // rankers, so one page could not win both. Old URL points at arches, which
  // carried the majority of the traffic.
  redirects: {
    '/services/arches-garlands': '/services/balloon-arches',
    // Shopify's collection index; the /shop hub plays that role here.
    '/collections': '/shop',
  },
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes('/quote/thanks') &&
        !page.includes('/404') &&
        // Gated magnet deliverable + its thank-you page stay out of the sitemap.
        !page.includes('/guide/') &&
        !page.includes('/side-hustle-guide/thanks') &&
        !page.includes('/cart') &&
        !page.includes('/checkout/') &&
        !page.includes('/search'),
    }),
    mdx(),
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    // Product photos live in Supabase Storage; the build resizes them (src/lib/shop/images.ts).
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
