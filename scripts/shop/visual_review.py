"""Side-by-side review sheets: the rebuilt page (left) next to the live Shopify page (right),
desktop 1440 and mobile 390, for every collection and product plus the key pages.
Writes PNGs and an index.html into the vault (plan section 7a).

  python scripts/shop/visual_review.py http://localhost:4330          # all pages
  python scripts/shop/visual_review.py http://localhost:4330 products/10-balloon-bouquet collections/all

The live store must still be up. Pixel-diff scores are not computed on purpose: the
main-site header is 12 px taller than the Shopify one, which shifts every pixel below it,
so a raw diff would flag every page. Review by eye, worst pages first in the index.
"""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright
from PIL import Image

NEW = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4330').rstrip('/')
LIVE = 'https://shop.balloonia.events'
OUT = r'C:/Users/dylan/Documents/axiom-balloon/Balloon Empire/04_Operations/shop-rebuild/diff'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36'
CSS = ('.site-header, sticky-header, .shopify-section-header-sticky { position: relative !important; top: 0 !important; } '
       '.scroll-trigger { opacity: 1 !important; transform: none !important; animation: none !important; } '
       'astro-dev-toolbar { display: none !important; }')
os.makedirs(OUT, exist_ok=True)

if len(sys.argv) > 2:
    paths = ['/' + p.lstrip('/') for p in sys.argv[2:]]
else:
    idx = json.load(urllib.request.urlopen(NEW + '/search-index.json'))
    cols = ['all', 'arches-garlands', 'walls-backdrops', 'centerpieces-columns', 'ceiling-installations', 'bouquets',
            'themed-setups', 'holiday-seasonal', 'specialty', 'add-ons-rentals', 'corporate', 'custom', 'birthdays',
            'weddings', 'showers', 'graduations', 'featured']
    paths = ([f'/collections/{c}' for c in cols] + [f'/products/{d["h"]}' for d in idx] +
             ['/search?q=arch', '/cart', '/policies/shipping-policy', '/policies/refund-policy',
              '/policies/privacy-policy', '/policies/terms-of-service'])


def shoot(browser, base, path, vp):
    kw = dict(viewport=vp, user_agent=UA)
    if vp['width'] < 500:
        kw.update(is_mobile=True, has_touch=True)
    ctx = browser.new_context(**kw)
    pg = ctx.new_page()
    try:
        pg.goto(base + path, wait_until='load', timeout=90000)
        pg.add_style_tag(content=CSS)
        pg.wait_for_timeout(1200)
        pg.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        pg.wait_for_timeout(700)
        pg.evaluate('window.scrollTo(0, 0)')
        pg.wait_for_timeout(400)
        return pg.screenshot(full_page=True)
    finally:
        ctx.close()


def run(chunk):
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for path in chunk:
            slug = path.strip('/').replace('/', '_').replace('?', '_').replace('=', '-') or 'home'
            for label, vp, cap in (('desktop', {'width': 1440, 'height': 900}, 2200), ('mobile', {'width': 390, 'height': 844}, 3000)):
                try:
                    a = Image.open(__import__('io').BytesIO(shoot(b, NEW, path, vp)))
                    c = Image.open(__import__('io').BytesIO(shoot(b, LIVE, path, vp)))
                except Exception as e:  # noqa: BLE001
                    rows.append((path, label, None, str(e)[:120]))
                    continue
                h = min(max(a.height, c.height), cap)
                sheet = Image.new('RGB', (a.width + c.width + 24, h), 'white')
                sheet.paste(a.crop((0, 0, a.width, min(h, a.height))), (0, 0))
                sheet.paste(c.crop((0, 0, c.width, min(h, c.height))), (a.width + 24, 0))
                name = f'{slug}_{label}.jpg'
                sheet.save(os.path.join(OUT, name), 'JPEG', quality=80, optimize=True)
                rows.append((path, label, name, f'new {a.height}px / live {c.height}px tall'))
        b.close()
    return rows


chunks = [paths[i::4] for i in range(4)]
with ThreadPoolExecutor(4) as ex:
    results = [r for part in ex.map(run, chunks) for r in part]
# Partial runs update their pages and keep the rest of the previous run in the index.
store = os.path.join(OUT, 'results.json')
prev = {}
if os.path.exists(store):
    prev = {(r[0], r[1]): r for r in json.load(open(store, encoding='utf-8'))}
for r in results:
    prev[(r[0], r[1])] = list(r)
results = sorted(prev.values(), key=lambda r: (r[0], r[1]))
json.dump(results, open(store, 'w', encoding='utf-8'))
html = ['<!doctype html><meta charset="utf-8"><title>Shop rebuild review</title>',
        '<style>body{font:14px system-ui;margin:24px;background:#fbf9f5}img{max-width:100%;border:1px solid #ddd}'
        'section{margin:0 0 40px}h2{font-size:15px;margin:0 0 6px}</style>',
        f'<h1>Shop rebuild: new (left) vs live Shopify (right)</h1><p>{len(results)} sheets. The main-site footer is taller than the Shopify one on every page, and products that gained an option set are taller by the widget.</p>']
for path, label, name, note in results:
    html.append(f'<section><h2>{path} · {label}</h2><p>{note}</p>' + (f'<a href="{name}"><img loading="lazy" src="{name}"></a>' if name else '') + '</section>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write('\n'.join(html))
print(f'{len(results)} sheets in index, {sum(1 for r in results if not r[2])} failed -> {OUT}/index.html')
