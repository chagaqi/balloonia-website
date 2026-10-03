// Shared shop types. Used by the build (Astro pages), the browser islands, and the
// /api functions, so keep this file free of runtime imports.

export type FieldType = 'radio' | 'buttons' | 'select' | 'swatches' | 'text' | 'textarea' | 'file' | 'date';

export type FieldOption = {
  value: string;
  price: number;
  help?: string;
  image?: string;
};

// One input in an option set. Shape comes from the decoded Globo config
// (scripts/shop/build_inputs.py), stored in option_sets.definition.fields.
export type Field = {
  id: string;
  type: FieldType;
  label: string;
  cartKey: string;
  required: boolean;
  default?: string;
  layout?: string;
  perRow?: number;
  placeholder?: string;
  maxLength?: number;
  multiple?: boolean;
  min?: number;
  max?: number;
  accept?: string[];
  withTime?: boolean;
  showWhen?: { field: string; equals: string };
  options?: FieldOption[];
};

export type OptionSet = {
  key: string;
  name: string;
  fields: Field[];
};

export type UploadValue = { path: string; name: string };

// Raw form state, keyed by field id.
export type FieldValue = string | string[] | UploadValue;
export type Values = Record<string, FieldValue | undefined>;

// What a cart line stores for each answered field.
export type Selection = {
  id: string;
  key: string;
  label: string;
  value: string; // display text
  raw: string | string[];
  price: number;
  upload?: UploadValue;
};

export type CartItem = {
  key: string;
  productId: number;
  variantId: number;
  handle: string;
  title: string;
  variantTitle: string | null;
  // Variant axes for display ("Size: 8ft"); absent on single-variant products.
  options?: { name: string; value: string }[];
  image: string | null;
  quantity: number;
  basePrice: number;
  addons: number;
  unitPrice: number;
  selections: Selection[];
  setKey: string | null;
};

export type Cart = {
  items: CartItem[];
  note: string;
};

// One product in /search-index.json (compact keys keep the file small).
export type SearchDoc = {
  id: number;
  h: string; // handle
  t: string; // title
  ty: string; // product type
  tg: string; // tags joined
  d: string; // description text
  v: string; // variant titles joined
  p: number; // min price
  pv: boolean; // price varies
  a: boolean; // available
  c: string; // created
  pos: number;
  img: string | null;
  srcset: string | null;
  th: string | null; // small thumbnail
  w: number;
  ht: number;
};
