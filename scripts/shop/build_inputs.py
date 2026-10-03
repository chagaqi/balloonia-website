"""Turn the captured Shopify + Globo data into clean, committed seed inputs.

Run once (already run 2026-10-03). Reads:
  - the vault capture folder  Balloon Empire/04_Operations/shop-rebuild/
  - the raw Globo config captured from a live product page (window.GPOConfigs)
  - the live store, for each collection's product order
Writes scripts/shop/data/*.json, which seed.py loads into Supabase.

Everything written here is public storefront data (it is served to every visitor of
shop.balloonia.events), so it is safe in this public repo.
"""
import csv, json, os, re, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'data')
VAULT = r'C:/Users/dylan/Documents/axiom-balloon/Balloon Empire/04_Operations/shop-rebuild'
RAW_GPO = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('GPO_RAW', '')
UA = {'User-Agent': 'Mozilla/5.0 (balloonia shop migration)'}
os.makedirs(OUT, exist_ok=True)


def get_json(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))


def dump(name, data):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('wrote', name)


# ---- catalog ---------------------------------------------------------------------------
products = json.load(open(f'{VAULT}/snapshot/products-2026-10-02.json', encoding='utf-8'))['products']
collections = json.load(open(f'{VAULT}/snapshot/collections-2026-10-02.json', encoding='utf-8'))['collections']

seo, archived = {}, []
for r in csv.DictReader(open(f'{VAULT}/exports/products_export_2026-10-02.csv', encoding='utf-8', errors='ignore')):
    if not r['Handle'] or not r['Title']:
        continue
    seo.setdefault(r['Handle'], {'title': r['SEO Title'], 'description': r['SEO Description']})
    if r['Status'] == 'archived' and r['Handle'] not in archived:
        archived.append(r['Handle'])

for p in products:
    s = seo.get(p['handle'], {})
    p['seo_title'] = s.get('title') or ''
    p['seo_description'] = s.get('description') or ''
dump('products.json', products)
dump('collections.json', collections)

order = {}
for c in collections:
    items = get_json(f"https://shop.balloonia.events/collections/{c['handle']}/products.json?limit=250")['products']
    order[c['handle']] = [p['handle'] for p in items]
order['all'] = [p['handle'] for p in get_json('https://shop.balloonia.events/collections/all/products.json?limit=250')['products']]
dump('collection-order.json', order)
dump('archived-handles.json', archived)

# ---- option sets -------------------------------------------------------------------------
# Globo set index (order of non-null entries in GPOConfigs.options) -> our key + DH's name.
SETS = {
    5: ('bouquets', 'Pattern C — Bouquets'),
    4: ('numbers', 'Pattern B — Number Balloons'),
    6: ('rentals', 'Pattern E — Day Rentals'),
    2: ('pick-color-palette', 'Pick Color Palette'),
    0: ('msg-bouquet-20', 'Custom Msg Balloon Bouqet 20inch'),
    1: ('msg-bouquet-3ft', 'Custom Message Bouqet 3ft'),
    # 3 is the Draft copy of Pick Color Palette; it renders nowhere and is folded into 2.
}
TYPE = {'radio': 'radio', 'buttons': 'buttons', 'dropdown': 'select', 'image-swatches': 'swatches',
        'text': 'text', 'textarea': 'textarea', 'file': 'file', 'datetime': 'date'}


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def field(e):
    f = {'id': e['id'], 'type': TYPE[e['type']], 'label': (e.get('label') or '').strip(),
         'cartKey': e.get('label_on_cart') or e['id'], 'required': bool(e.get('required'))}
    dv = e.get('default_value')
    if dv:
        f['default'] = str(dv[0] if isinstance(dv, list) else dv).strip()
    if e.get('style'):
        f['layout'] = e['style']
    if e.get('swatches_per_row'):
        f['perRow'] = int(e['swatches_per_row'])
    if e.get('placeholder'):
        f['placeholder'] = e['placeholder']
    if e['type'] in ('text', 'textarea') and e.get('max'):
        f['maxLength'] = int(e['max'])
    if e['type'] == 'image-swatches' and e.get('allow_multiple'):
        f['multiple'] = True
        f['min'] = int(e.get('min') or 0)
        f['max'] = int(e.get('max') or 0)
    if e['type'] == 'file':
        f['accept'] = e.get('allowed_extensions') or ['jpeg', 'jpg', 'png']
    if e['type'] == 'datetime':
        f['withTime'] = e.get('format') == 'date-and-time'
    clo = e.get('clo') or {}
    if e.get('conditionalField') and clo.get('whens'):
        w = clo['whens'][0]
        f['showWhen'] = {'field': w['select'], 'equals': str(w['value']).strip()}
    opts = []
    for v in e.get('option_values') or []:
        if not isinstance(v, dict):
            continue
        o = {'value': str(v.get('value', '')).strip(), 'price': num(v.get('price'))}
        if v.get('helptext'):
            o['help'] = v['helptext'].strip()
        if v.get('asset_name'):
            o['image'] = 'swatches/' + v['asset_name']
        opts.append(o)
    if opts:
        f['options'] = opts
    return f


def flatten(els):
    out = []
    for e in els or []:
        if isinstance(e, dict):
            if e.get('type') == 'group':
                out += flatten(e.get('elements'))
            else:
                out.append(e)
    return out


if not RAW_GPO or not os.path.exists(RAW_GPO):
    sys.exit('pass the raw GPOConfigs JSON path as argv[1]')
raw = [o for o in json.load(open(RAW_GPO, encoding='utf-8'))['options'] if o]
sets = []
for idx, (key, name) in SETS.items():
    fields = [field(e) for e in flatten(raw[idx]['elements'])]
    sets.append({'key': key, 'name': name, 'fields': fields})

by_key = {s['key']: s for s in sets}
bouquet_palette = next(f for f in by_key['bouquets']['fields'] if f['id'] == 'radio-1')
bouquet_colors = next(f for f in by_key['bouquets']['fields'] if f['id'] == 'image-swatches-1')

# Decision 3 (plan section 9): Pattern B's colour picker is wired to a Color Palette radio
# the set never had. Give it the same radio and the same up-to-3 multi-select as bouquets.
numbers = by_key['numbers']['fields']
if not any(f['id'] == 'radio-1' and f['label'] == 'Color Palette' for f in numbers):
    # Pattern B already has its own radio-1 ("Add another number") and radio-2 ("Add name").
    # Give the palette radio a fresh id and point the colour picker at it.
    pal = dict(bouquet_palette, id='palette-1')
    numbers.insert(0, pal)
    for f in numbers:
        if f['id'] == 'image-swatches-1':
            f['showWhen'] = {'field': 'palette-1', 'equals': 'Choose my own colors'}
            f['multiple'], f['min'], f['max'] = True, 1, 3
            f.setdefault('perRow', bouquet_colors.get('perRow', 3))

# ---- assignments (plan section 5d, defaults from section 9) -------------------------------
P = {p['handle']: p for p in products}
assign = {k: [] for k in by_key}
assign['msg-bouquet-20'] = ['custom-message-bouquet-20']
assign['msg-bouquet-3ft'] = ['custom-message-bouquet-3ft']
assign['bouquets'] = [p['handle'] for p in products if 'bouquet' in p['tags']
                      and p['handle'] not in ('custom-message-bouquet-20', 'custom-message-bouquet-3ft')]
assign['numbers'] = [h for h in ['balloon-numbers', 'wooow-balloon-numbers', 'elegant-number-balloon-arrangement',
                                 'birthday-number-balloon-arrangement', '60th-birthday-balloons', '70th-birthday-balloons',
                                 'jungle-snake-balloon-number', 'graduation-balloon-numbers',
                                 'balloon-stand-with-helium-filled-balloons'] if h in P]
rental_ids = {int(x) for x in raw[6]['products']['rule']['manual']['ids']}
assign['rentals'] = [p['handle'] for p in products if p['id'] in rental_ids]
taken = set(assign['numbers']) | set(assign['rentals']) | set(assign['bouquets'])
INSTALL_TYPES = {'arch', 'garland', 'wall', 'backdrop', 'ceiling', 'column', 'centerpiece'}
assign['pick-color-palette'] = [p['handle'] for p in products
                                if p['product_type'] in INSTALL_TYPES and 'custom' not in p['tags']
                                and p['handle'] not in taken
                                and not any(o['name'].lower() == 'color' for o in p['options'])]
for s in sets:
    s['products'] = assign[s['key']]
dump('option-sets.json', sets)
for s in sets:
    print(f"  {s['key']:20s} {len(s['fields'])} fields, {len(s['products'])} products")
