"""Copy the live store's "You may also like" lists into Supabase (settings.recommendations).

Shopify picks these with its own recommendation engine (purchase history + text
similarity), which we cannot rerun. Saving what it shows today keeps the product pages
1:1; products added later fall back to same type + shared tags (src/lib/shop/catalog.ts).

  python scripts/shop/recommendations.py   # needs the Shopify store to still be up
"""
import json, os, re, urllib.request
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg.types.json import Jsonb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))
UA = {'User-Agent': 'Mozilla/5.0 (balloonia shop migration)'}
STORE = 'https://shop.balloonia.events'


def recs(row):
    pid, handle = row
    url = f'{STORE}/recommendations/products.json?product_id={pid}&limit=4&intent=related'
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        data = json.load(r)
    return handle, [p['handle'] for p in data.get('products', [])]


with psycopg.connect(env['POSTGRES_URL'], connect_timeout=30) as c:
    rows = c.execute("select id, handle from products where status = 'active'").fetchall()
    with ThreadPoolExecutor(6) as ex:
        out = dict(ex.map(recs, rows))
    c.execute("insert into settings values ('recommendations', %s) on conflict (key) do update set value = excluded.value",
              (Jsonb(out),))
    c.commit()
print(f'{len(out)} products, {sum(1 for v in out.values() if v)} with recommendations, '
      f'{sum(len(v) for v in out.values())} links')
