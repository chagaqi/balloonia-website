export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type MegaColumn = {
  heading: string;
  items: NavItem[];
};

export type MegaFeature = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  image?: string;
  imageAlt?: string;
};

export type PrimaryNavItem =
  | (NavItem & { mega?: undefined })
  | (NavItem & {
      mega: {
        columns: MegaColumn[];
        feature?: MegaFeature;
        compact?: boolean;
      };
    });

export const primaryNav: PrimaryNavItem[] = [
  {
    label: 'Services',
    href: '/services',
    mega: {
      columns: [
        {
          heading: 'By event',
          items: [
            { label: 'Weddings', href: '/services/weddings' },
            { label: 'Corporate', href: '/services/corporate' },
            { label: 'Baby and bridal showers', href: '/services/showers' },
            { label: 'Birthdays', href: '/services/birthdays' },
            { label: 'Graduations', href: '/services/graduations' },
          ],
        },
        {
          heading: 'By install type',
          items: [
            { label: 'Arches and garlands', href: '/services/arches-garlands' },
            { label: 'Walls and backdrops', href: '/services/walls-backdrops' },
            { label: 'Centerpieces', href: '/services/centerpieces' },
            { label: 'Number and letter columns', href: '/services/columns' },
            { label: 'Ceiling installs', href: '/services/ceiling' },
            { label: 'Photo booth setups', href: '/services/photo-booth' },
            { label: 'Bouquets', href: '/services/bouquets' },
          ],
        },
        {
          heading: 'For B2B',
          items: [
            { label: 'Corporate packages', href: '/services/corporate' },
            { label: 'Custom themed installs', href: '/services/custom-themed' },
            { label: 'Corporate offerings', href: 'https://corp.balloonia.events' },
            { label: 'Book a discovery call', href: '/contact' },
          ],
        },
      ],
    },
  },
  {
    label: 'Order Online',
    href: '/shop',
    mega: {
      columns: [
        {
          heading: 'By install type',
          items: [
            { label: 'Arches and garlands', href: 'https://shop.balloonia.events/collections/arches-garlands'},
            { label: 'Walls and backdrops', href: 'https://shop.balloonia.events/collections/walls-backdrops'},
            { label: 'Centerpieces and columns', href: 'https://shop.balloonia.events/collections/centerpieces-columns'},
            { label: 'Ceiling installations', href: 'https://shop.balloonia.events/collections/ceiling-installations'},
            { label: 'Bouquets', href: 'https://shop.balloonia.events/collections/bouquets'},
          ],
        },
        {
          heading: 'Themed and seasonal',
          items: [
            { label: 'Themed setups', href: 'https://shop.balloonia.events/collections/themed-setups'},
            { label: 'Holiday and seasonal', href: 'https://shop.balloonia.events/collections/holiday-seasonal'},
            { label: 'Specialty', href: 'https://shop.balloonia.events/collections/specialty'},
            { label: 'Add-ons and rentals', href: 'https://shop.balloonia.events/collections/add-ons-rentals'},
          ],
        },
      ],
    },
  },
  {
    label: 'About',
    href: '/about',
    mega: {
      compact: true,
      columns: [
        {
          heading: '',
          items: [
            { label: 'About us', href: '/about' },
            { label: 'Portfolio', href: '/portfolio' },
          ],
        },
      ],
    },
  },
  { label: 'Contact', href: '/contact' },
];

export const footerNav: NavItem[] = [
  { label: 'Weddings', href: '/services/weddings' },
  { label: 'Corporate', href: '/services/corporate' },
  { label: 'Showers', href: '/services/showers' },
  { label: 'Birthdays', href: '/services/birthdays' },
  { label: 'Graduations', href: '/services/graduations' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Get a quote', href: '/quote' },
];
