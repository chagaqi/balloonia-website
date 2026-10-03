"""Replace the full-size Shopify originals in Supabase Storage with 1600 px WebP masters.

The Shopify CDN originals total ~760 MB (multi-MB camera files). The storefront never
needs more than ~1600 px, and the Astro build makes the smaller srcset widths from the
master and serves them from Vercel's CDN. Originals are archived outside the repo first,
because the Shopify CDN disappears when the store closes.

  python scripts/shop/images.py
"""
import io, os, re, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
import psycopg
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ARCHIVE = r'C:/Users/dylan/Documents/axiom-balloon/Balloon Empire/04_Operations/shop-rebuild/originals'
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))
SB, KEY = env['SUPABASE_URL'].rstrip('/'), env['SUPABASE_SERVICE_ROLE_KEY']
UA = {'User-Agent': 'Mozilla/5.0 (balloonia shop migration)'}
MAX = 1600


def storage(method, path, data=None, ctype=None, extra=None):
    h = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', **(extra or {})}
    if ctype:
        h['Content-Type'] = ctype
    req = urllib.request.Request(f'{SB}/storage/v1/{path}', data=data, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def work(row):
    iid, handle, pos, src, old_path = row
    url = re.sub(r'\?.*$', '', src)
    fname = url.rsplit('/', 1)[-1]
    os.makedirs(os.path.join(ARCHIVE, handle), exist_ok=True)
    arch = os.path.join(ARCHIVE, handle, f'{pos}-{iid}-{fname}')
    if os.path.exists(arch):
        raw = open(arch, 'rb').read()
    else:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
            raw = r.read()
        open(arch, 'wb').write(raw)
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=82, method=6)
    new_path = f'products/{handle}/{pos}-{iid}.webp'
    storage('POST', f'object/product-images/{urllib.parse.quote(new_path)}', buf.getvalue(), 'image/webp',
            {'x-upsert': 'true', 'cache-control': 'max-age=31536000'})
    return iid, old_path, new_path, im.width, im.height, len(raw), buf.tell()


def main():
    with psycopg.connect(env['POSTGRES_URL'], connect_timeout=30) as c:
        rows = c.execute("""select i.id, p.handle, i.position, i.src, i.storage_path
                            from product_images i join products p on p.id = i.product_id order by p.handle, i.position""").fetchall()
        with ThreadPoolExecutor(6) as ex:
            results = list(ex.map(work, rows))
        stale = []
        for iid, old, new, w, h, before, after in results:
            c.execute('update product_images set storage_path=%s, width=%s, height=%s where id=%s', (new, w, h, iid))
            if old and old != new:
                stale.append(old)
        c.commit()
    if stale:
        import json
        for i in range(0, len(stale), 100):
            storage('DELETE', 'object/product-images', json.dumps({'prefixes': stale[i:i + 100]}).encode(), 'application/json')
    before = sum(r[5] for r in results) // 1024 // 1024
    after = sum(r[6] for r in results) // 1024 // 1024
    print(f'{len(results)} images: {before} MB originals archived -> {after} MB WebP masters; {len(stale)} originals removed from Storage')


if __name__ == '__main__':
    main()
