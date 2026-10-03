"""Load scripts/shop/data/*.json into Supabase (tables + Storage). Idempotent; safe to rerun.

  python scripts/shop/seed.py            # everything
  python scripts/shop/seed.py --no-images

Reads POSTGRES_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from .env.
Images: product photos are copied from the Shopify CDN as-is (they are already web-sized);
swatches are downsized to 160 px WebP because Globo's originals are ~140 KB each and a
bouquet page shows 53 of them.
"""
import io, json, os, re, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
import psycopg
from psycopg.types.json import Jsonb

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DATA = os.path.join(HERE, 'data')
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))
SB, KEY = env['SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
UA = {'User-Agent': 'Mozilla/5.0 (balloonia shop migration)'}
BUCKET = 'product-images'


def load(name):
    return json.load(open(os.path.join(DATA, name), encoding='utf-8'))


def sb(method, path, body=None, headers=None, raw=None):
    h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', **(headers or {})}
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    if body is not None and raw is None:
        h['Content-Type'] = 'application/json'
    req = urllib.request.Request(f'{SB}{path}', data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read()
            return json.loads(t) if t else None
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'body': e.read().decode()[:300]}


def ensure_buckets():
    have = {b['name'] for b in sb('GET', '/storage/v1/bucket') or []}
    for name, public in ((BUCKET, True), ('customer-uploads', False)):
        if name not in have:
            print('create bucket', name, sb('POST', '/storage/v1/bucket',
                  {'id': name, 'name': name, 'public': public, 'file_size_limit': 10 * 1024 * 1024}))


def upload(path, content, ctype):
    return sb('POST', f'/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}', raw=content,
              headers={'Content-Type': ctype, 'x-upsert': 'true', 'cache-control': 'max-age=31536000'})


def public_url(path):
    return f'{SB}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(path)}'


EXT = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif'}


def copy_image(img, handle):
    src = re.sub(r'\?.*$', '', img['src'])
    with urllib.request.urlopen(urllib.request.Request(src, headers=UA), timeout=60) as r:
        content, ctype = r.read(), r.headers.get('Content-Type', 'image/jpeg').split(';')[0]
    path = f"products/{handle}/{img['position']}-{img['id']}.{EXT.get(ctype, 'jpg')}"
    res = upload(path, content, ctype)
    if isinstance(res, dict) and res.get('error'):
        raise RuntimeError(f'{path}: {res}')
    return img['id'], path, len(content)


def copy_swatch(asset):
    from PIL import Image
    with urllib.request.urlopen(urllib.request.Request(f'https://shop.balloonia.events/cdn/shop/files/{asset}', headers=UA), timeout=60) as r:
        im = Image.open(io.BytesIO(r.read())).convert('RGBA')
    im.thumbnail((160, 160))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=88)
    path = 'swatches/' + re.sub(r'\.[a-z]+$', '.webp', asset)
    res = upload(path, buf.getvalue(), 'image/webp')
    if isinstance(res, dict) and res.get('error'):
        raise RuntimeError(f'{path}: {res}')
    return asset, path


def main():
    products = load('products.json')
    collections = load('collections.json')
    order = load('collection-order.json')
    sets = load('option-sets.json')
    archived = load('archived-handles.json')
    by_handle = {p['handle']: p for p in products}
    do_images = '--no-images' not in sys.argv

    ensure_buckets()
    paths = {}
    swatch_paths = {}
    if do_images:
        jobs = [(img, p['handle']) for p in products for img in p['images']]
        with ThreadPoolExecutor(8) as ex:
            total = 0
            for iid, path, size in ex.map(lambda a: copy_image(*a), jobs):
                paths[iid] = path
                total += size
        print(f'images: {len(paths)} uploaded, {total // 1024} KB')
        assets = sorted({o['image'][len('swatches/'):] for s in sets for f in s['fields'] for o in f.get('options', []) if o.get('image')})
        with ThreadPoolExecutor(8) as ex:
            for asset, path in ex.map(copy_swatch, assets):
                swatch_paths[asset] = path
        print(f'swatches: {len(swatch_paths)} uploaded')

    # swatch references -> public URLs (kept even on --no-images reruns via the naming rule)
    for s in sets:
        for f in s['fields']:
            for o in f.get('options', []):
                if o.get('image'):
                    asset = o['image'][len('swatches/'):]
                    o['image'] = public_url(swatch_paths.get(asset) or 'swatches/' + re.sub(r'\.[a-z]+$', '.webp', asset))

    with psycopg.connect(env['POSTGRES_URL'], connect_timeout=30) as c:
        cur = c.cursor()
        for t in ('product_option_sets', 'option_sets', 'collection_products', 'collections',
                  'product_options', 'variants', 'product_images', 'products'):
            cur.execute(f'delete from {t}')
        pos_all = {h: i for i, h in enumerate(order['all'])}
        for p in products:
            cur.execute("""insert into products (id, handle, title, body_html, product_type, vendor, tags, status,
                           seo_title, seo_description, position, created_at, updated_at)
                           values (%s,%s,%s,%s,%s,%s,%s,'active',%s,%s,%s,%s,%s)""",
                        (p['id'], p['handle'], p['title'], p['body_html'], p['product_type'], p['vendor'], p['tags'],
                         p['seo_title'], p['seo_description'], pos_all.get(p['handle']), p['created_at'], p['updated_at']))
            for img in p['images']:
                path = paths.get(img['id']) or f"products/{p['handle']}/{img['position']}-{img['id']}.jpg"
                cur.execute("""insert into product_images (id, product_id, position, src, alt, width, height, storage_path)
                               values (%s,%s,%s,%s,%s,%s,%s,%s)""",
                            (img['id'], p['id'], img['position'], img['src'], p['title'], img['width'], img['height'], path))
            for o in p['options']:
                cur.execute('insert into product_options (product_id, name, position, values) values (%s,%s,%s,%s)',
                            (p['id'], o['name'], o['position'], o['values']))
            for v in p['variants']:
                fi = v.get('featured_image') or {}
                cur.execute("""insert into variants (id, product_id, title, option1, option2, option3, price, compare_at_price,
                               sku, available, position, image_id) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                            (v['id'], p['id'], v['title'], v['option1'], v['option2'], v['option3'], v['price'],
                             v.get('compare_at_price'), v.get('sku'), v['available'], v['position'], fi.get('id')))
        for i, col in enumerate(collections):
            cur.execute("""insert into collections (id, handle, title, body_html, image, position, sort_order)
                           values (%s,%s,%s,%s,%s,%s,'manual')""",
                        (col['id'], col['handle'], col['title'], col.get('body_html') or '', None, i))
            for j, h in enumerate(order.get(col['handle'], [])):
                if h in by_handle:
                    cur.execute('insert into collection_products values (%s,%s,%s)', (col['id'], by_handle[h]['id'], j))
        for s in sets:
            cur.execute('insert into option_sets (key, name, definition, active) values (%s,%s,%s,true) returning id',
                        (s['key'], s['name'], Jsonb({'fields': s['fields']})))
            sid = cur.fetchone()[0]
            for h in s['products']:
                cur.execute('insert into product_option_sets values (%s,%s) on conflict do nothing', (by_handle[h]['id'], sid))
        settings = {
            'tax': {'rate': 0.13, 'label': 'HST', 'inclusive': False},
            # Rates come from Shopify admin (Settings > Shipping). Until DH sends them, only
            # pickup is offered at checkout; an option with amount null is never shown.
            'delivery': {'options': [
                {'id': 'pickup', 'label': 'Pickup at 412 Newbold St, London', 'amount': 0},
                {'id': 'london', 'label': 'Delivery in London + 50 km', 'amount': None},
                {'id': 'extended', 'label': 'Delivery up to 250 km from London', 'amount': None}]},
            'order_number_seed': 1001,
            'pickup_address': '412 Newbold St, Unit 4, London, ON N6E 1K1',
            'archived_handles': archived,
            'money_format': '${{amount}}',
        }
        for k, v in settings.items():
            cur.execute('insert into settings values (%s,%s) on conflict (key) do update set value = excluded.value',
                        (k, Jsonb(v)))
        c.commit()
        for t in ('products', 'variants', 'product_images', 'product_options', 'collections', 'collection_products',
                  'option_sets', 'product_option_sets', 'settings'):
            print(f'  {t}: {cur.execute(f"select count(*) from {t}").fetchone()[0]}')


if __name__ == '__main__':
    main()
