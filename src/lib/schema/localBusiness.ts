import { business } from '../../data/business';

const dayMap: Record<string, string> = {
  Monday: 'Mo',
  Tuesday: 'Tu',
  Wednesday: 'We',
  Thursday: 'Th',
  Friday: 'Fr',
  Saturday: 'Sa',
  Sunday: 'Su',
};

function openingHoursSpec() {
  return business.hours.map((block) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: block.days.map((d) => `https://schema.org/${d}`),
    opens: block.opens,
    closes: block.closes,
  }));
}

function sameAs(): string[] {
  return [business.social.instagram, business.social.facebook, business.social.googleBusiness].filter(Boolean);
}

export function localBusinessSchema() {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${business.url}#localbusiness`,
    name: business.name,
    legalName: business.legalName,
    description: business.description,
    url: business.url,
    email: business.email,
    image: `${business.url}/og-default.svg`,
    priceRange: '$$',
    areaServed: {
      '@type': 'City',
      name: business.serviceArea.city,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: business.address.addressLocality,
      addressRegion: business.address.addressRegion,
      addressCountry: business.address.addressCountry,
    },
    openingHoursSpecification: openingHoursSpec(),
  };

  if (business.phone) {
    schema.telephone = business.phone;
  }
  if (business.address.streetAddress) {
    (schema.address as Record<string, unknown>).streetAddress = business.address.streetAddress;
  }
  if (business.address.postalCode) {
    (schema.address as Record<string, unknown>).postalCode = business.address.postalCode;
  }
  const links = sameAs();
  if (links.length) {
    schema.sameAs = links;
  }
  return schema;
}

export { dayMap };
