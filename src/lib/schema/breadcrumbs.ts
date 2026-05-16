import { business } from '../../data/business';

export type Crumb = {
  name: string;
  url: string;
};

export function breadcrumbsSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${business.url}${crumb.url}`,
    })),
  };
}
