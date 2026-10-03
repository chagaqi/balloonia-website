"""Before going live: delete test-mode orders and carts, then point the order number
sequence at the next real number.

  python scripts/shop/reset_test_orders.py            # next order = settings.order_number_seed (1001)
  python scripts/shop/reset_test_orders.py 2041       # next order = 2041 (last Shopify order + 1)
"""
import os, re, sys
import psycopg

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))
with psycopg.connect(env['POSTGRES_URL'], connect_timeout=30) as c:
    n = c.execute('delete from orders where livemode is not true').rowcount
    k = c.execute("delete from carts where created_at < now() - interval '1 minute'").rowcount
    seed = c.execute("select (value)::text::int from settings where key = 'order_number_seed'").fetchone()[0]
    nxt = int(sys.argv[1]) if len(sys.argv) > 1 else seed
    live_max = c.execute('select max(number) from orders').fetchone()[0]
    if live_max and live_max >= nxt:
        sys.exit(f'live orders already reach #{live_max}; refusing to reuse numbers')
    c.execute('select setval(%s, %s, false)', ('order_number_seq', nxt))
    c.commit()
print(f'deleted {n} test orders and {k} carts; next order number is #{nxt}')
