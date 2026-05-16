export type ProductCategory =
  | 'arches'
  | 'walls'
  | 'centerpieces'
  | 'columns'
  | 'ceiling'
  | 'photo-booth'
  | 'showers'
  | 'weddings'
  | 'corporate'
  | 'custom';

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  category: ProductCategory;
  startingPrice: number;
  image: {
    src: string;
    alt: string;
  };
  tags: string[];
};
