-- Straight-line distance from the shop to the delivery address, worked out by the
-- webhook, plus any warning it raised (wrong delivery band for the address).
alter table orders add column if not exists delivery_km numeric(6,1);
alter table orders add column if not exists delivery_warning text;
