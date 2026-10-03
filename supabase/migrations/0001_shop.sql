-- Balloonia shop: catalog, options, carts, orders. Mirrors the Shopify store 1:1.
-- Apply with: python scripts/shop/migrate.py   (reads POSTGRES_URL from .env)
-- Plan: Balloon Empire/04_Operations/shop-rebuild/PLAN-shop-rebuild-2026-10-02.md, section 2.

create table if not exists products (
  id bigint primary key,                       -- Shopify product id, kept so exports cross-reference
  handle text unique not null,
  title text not null,
  body_html text,
  product_type text,
  vendor text default 'Balloonia Events',
  tags text[] default '{}',
  status text default 'active',                -- active | archived
  seo_title text,
  seo_description text,
  position int,
  created_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists product_images (
  id bigint primary key,
  product_id bigint references products on delete cascade,
  position int,
  src text,                                    -- original Shopify CDN URL
  alt text,
  width int,
  height int,
  storage_path text                            -- product-images/<handle>/<position>.<ext>
);

create table if not exists product_options (    -- Shopify option axes: Size, Color, Digit, Choose...
  id bigserial primary key,
  product_id bigint references products on delete cascade,
  name text,
  position int,
  values text[]
);

create table if not exists variants (
  id bigint primary key,
  product_id bigint references products on delete cascade,
  title text,
  option1 text, option2 text, option3 text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  sku text,
  available boolean default true,
  position int,
  image_id bigint
);

create table if not exists collections (
  id bigint primary key,
  handle text unique not null,
  title text,
  body_html text,
  image text,
  position int,
  sort_order text default 'manual'
);

create table if not exists collection_products (
  collection_id bigint references collections on delete cascade,
  product_id bigint references products on delete cascade,
  position int,
  primary key (collection_id, product_id)
);

create table if not exists option_sets (        -- one row per Globo set; definition = decoded Globo JSON
  id serial primary key,
  key text unique not null,                    -- bouquets | numbers | rentals | pick-color-palette | msg-bouquet-20 | msg-bouquet-3ft
  name text,
  definition jsonb not null,
  active boolean default true
);

create table if not exists product_option_sets (
  product_id bigint references products on delete cascade,
  option_set_id int references option_sets on delete cascade,
  primary key (product_id, option_set_id)
);

create table if not exists settings (
  key text primary key,
  value jsonb
);

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  subtotal numeric(10,2),
  note text,
  email text,
  stripe_session_id text,
  created_at timestamptz default now()
);

create table if not exists orders (
  id bigserial primary key,
  number int unique,                           -- continues from the last Shopify order number (settings.order_number_seed)
  stripe_session_id text unique,
  stripe_payment_intent text,
  email text,
  phone text,
  name text,
  shipping jsonb,
  delivery_method text,                        -- pickup | london | extended
  subtotal numeric(10,2),
  shipping_total numeric(10,2),
  tax_total numeric(10,2),
  discount_total numeric(10,2),
  total numeric(10,2),
  promo_code text,
  note text,
  status text default 'paid',                  -- paid | fulfilled | refunded | cancelled
  created_at timestamptz default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint references orders on delete cascade,
  product_id bigint,
  variant_id bigint,
  handle text,
  title text,
  variant_title text,
  quantity int,
  unit_price numeric(10,2),
  addons_total numeric(10,2),
  line_total numeric(10,2),
  selections jsonb,                            -- [{key, label, value, price}]
  uploads text[]                               -- paths in bucket customer-uploads
);

create index if not exists idx_products_handle on products (handle);
create index if not exists idx_products_status on products (status);
create index if not exists idx_variants_product on variants (product_id);
create index if not exists idx_images_product on product_images (product_id, position);
create index if not exists idx_cp_collection on collection_products (collection_id, position);
create index if not exists idx_orders_created on orders (created_at desc);

-- Nothing is read from the browser directly (the site is built from these tables with the
-- service role key, and the API functions use it too), so RLS stays on with no anon policies.
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_options enable row level security;
alter table variants enable row level security;
alter table collections enable row level security;
alter table collection_products enable row level security;
alter table option_sets enable row level security;
alter table product_option_sets enable row level security;
alter table settings enable row level security;
alter table carts enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
