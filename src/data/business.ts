// Single source of truth for NAP and business facts.
// Every JSON-LD generator and chrome element reads from here.

export const business = {
  name: 'Balloonia Events',
  legalName: 'Balloonia Events',
  email: 'contact@balloonia.events',
  phone: import.meta.env.PUBLIC_PHONE,
  url: 'https://balloonia.events',
  shopUrl: 'https://shop.balloonia.events',
  description:
    "Custom balloon installations in London Ontario. Wedding arches, shower walls, corporate activations, kids birthdays, grad backdrops. Delivered and set up.",
  founded: '2024',
  address: {
    streetAddress: '412 Newbold St, Unit 4',
    addressLocality: 'London',
    addressRegion: 'ON',
    postalCode: 'N6E 1K1',
    addressCountry: 'CA',
  },
  serviceArea: {
    city: 'London, Ontario',
    radiusKm: 50,
    nearby: ['St. Thomas', 'Strathroy', 'Ingersoll', 'Woodstock'],
  },
  hours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
    { days: ['Saturday'], opens: '11:00', closes: '18:00' },
  ],
  hoursDisplay: 'Mon-Fri 9-6, Sat 11-6, Sun closed',
  social: {
    instagram: 'https://instagram.com/balloonia.co',
    pinterest: 'https://ca.pinterest.com/ballooniaeventscanada/',
    facebook: '',
    googleBusiness: '',
  },
  honeybookScheduler: import.meta.env.PUBLIC_HONEYBOOK_SCHEDULER,
} as const;

export type Business = typeof business;
