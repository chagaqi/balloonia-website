export type PricingRow = {
  service: string;
  startingPrice: number;
  slug: string;
};

export const pricingRows: PricingRow[] = [
  { service: 'Balloon arches and garlands', startingPrice: 160, slug: 'balloon-arches' },
  { service: 'Balloon walls and backdrops', startingPrice: 200, slug: 'balloon-walls' },
  { service: 'Centerpieces', startingPrice: 60, slug: 'centerpieces' },
  { service: 'Number and letter columns', startingPrice: 150, slug: 'number-letter-columns' },
  { service: 'Ceiling installations', startingPrice: 599, slug: 'ceiling-installations' },
  { service: 'Photo booth setups', startingPrice: 200, slug: 'photo-booth' },
  { service: 'Baby and bridal shower packages', startingPrice: 300, slug: 'shower-packages' },
  { service: 'Wedding balloon decor', startingPrice: 500, slug: 'wedding-decor' },
  { service: 'Corporate event packages', startingPrice: 300, slug: 'corporate-packages' },
  { service: 'Custom themed installations', startingPrice: 200, slug: 'custom-themed' },
];
