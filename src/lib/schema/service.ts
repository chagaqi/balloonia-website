import { business } from '../../data/business';

export type ServiceInput = {
  name: string;
  description: string;
  startingPrice: number;
  url: string;
};

export function serviceSchema(input: ServiceInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    provider: {
      '@type': 'LocalBusiness',
      '@id': `${business.url}#localbusiness`,
      name: business.name,
    },
    areaServed: {
      '@type': 'City',
      name: business.serviceArea.city,
    },
    url: `${business.url}${input.url}`,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CAD',
      price: input.startingPrice,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'CAD',
        price: input.startingPrice,
        valueAddedTaxIncluded: false,
      },
      availability: 'https://schema.org/InStock',
    },
  };
}
