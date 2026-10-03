-- Order numbers come from a sequence so two webhooks arriving together can never
-- take the same number. It starts at settings.order_number_seed (1001). When DH
-- exports the last Shopify order number N, continue the series with:
--   select setval('order_number_seq', N);
create sequence if not exists order_number_seq start 1001;
alter table orders alter column number set default nextval('order_number_seq');
alter sequence order_number_seq owned by orders.number;

create index if not exists idx_orders_payment_intent on orders (stripe_payment_intent);
create index if not exists idx_carts_session on carts (stripe_session_id);
alter table orders add column if not exists livemode boolean default false;
alter table orders add column if not exists emails_sent_at timestamptz;
