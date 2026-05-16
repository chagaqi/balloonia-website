// Shopify collection metadata for the /shop "Order Online" hub.
// Slugs match the live Storefront collections (verified via API probe).
// Corporate intentionally omitted — corporate work is custom-quote, not stock.

export type ShopCollection = {
  handle: string;
  title: string;
  blurb: string;
  group: 'install-type' | 'event' | 'specialty';
  thumb?: string;
};

const SHOP_BASE = 'https://shop.balloonia.events/collections';

export const shopCollections: ShopCollection[] = [
  {
    handle: 'arches-garlands',
    title: 'Arches and Garlands',
    blurb: 'Organic, hoop, geometric. Stock SKUs from $160. Custom builds via quote.',
    group: 'install-type',
    thumb: '/images/services/balloon-arches.svg',
  },
  {
    handle: 'walls-backdrops',
    title: 'Walls and Backdrops',
    blurb: 'Photo-op walls and ceremony backdrops. From $200.',
    group: 'install-type',
    thumb: '/images/services/balloon-walls.svg',
  },
  {
    handle: 'centerpieces-columns',
    title: 'Centerpieces and Columns',
    blurb: 'Table centerpieces, bouquet stands, milestone number columns.',
    group: 'install-type',
    thumb: '/images/services/centerpieces.svg',
  },
  {
    handle: 'ceiling-installations',
    title: 'Ceiling Installations',
    blurb: 'Overhead clusters and floating displays. From $599.',
    group: 'install-type',
    thumb: '/images/services/ceiling-installations.svg',
  },
  {
    handle: 'bouquets',
    title: 'Bouquets',
    blurb: 'Entry-tier helium bouquets, deliverable around London.',
    group: 'install-type',
  },
  {
    handle: 'themed-setups',
    title: 'Themed Setups',
    blurb: 'Unicorn, dinosaur, sports, carnival. Kid-party ready.',
    group: 'specialty',
  },
  {
    handle: 'holiday-seasonal',
    title: 'Holiday and Seasonal',
    blurb: 'Valentine\'s, Mother\'s Day, Christmas, New Year. Limited windows.',
    group: 'specialty',
  },
  {
    handle: 'specialty',
    title: 'Specialty',
    blurb: 'Proposals, baby reveals, room decor, hotel installs.',
    group: 'specialty',
  },
  {
    handle: 'add-ons-rentals',
    title: 'Add-Ons and Rentals',
    blurb: 'Frames, accessories, and rental items.',
    group: 'specialty',
  },
];

export const eventCollections: ShopCollection[] = [
  {
    handle: 'weddings',
    title: 'Weddings',
    blurb: 'Stock wedding accents. Full custom installs via the wedding quote.',
    group: 'event',
  },
  {
    handle: 'showers',
    title: 'Showers',
    blurb: 'Baby and bridal shower SKUs.',
    group: 'event',
  },
  {
    handle: 'birthdays',
    title: 'Birthdays',
    blurb: 'Milestone arches, kid themes, number columns.',
    group: 'event',
  },
  {
    handle: 'graduations',
    title: 'Graduations',
    blurb: 'Class-of columns, school-color garlands.',
    group: 'event',
  },
];

export function shopCollectionUrl(handle: string): string {
  return `${SHOP_BASE}/${handle}`;
}

export function shopAllUrl(): string {
  return SHOP_BASE;
}
