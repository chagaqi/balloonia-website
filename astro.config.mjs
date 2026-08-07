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
  },
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes('/quote/thanks') &&
        !page.includes('/404') &&
        // Gated magnet deliverable + its thank-you page stay out of the sitemap.
        !page.includes('/guide/') &&
        !page.includes('/side-hustle-guide/thanks'),
    }),
    mdx(),
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
