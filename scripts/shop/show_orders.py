"""Print the latest live shop orders with their items. Read-only.

  python scripts/shop/show_orders.py          # last 5 live orders
  python scripts/shop/show_orders.py 1658     # one order by number
"""
import json, os, re, sys
from zoneinfo import ZoneInfo
import psycopg

TZ = ZoneInfo('America/Toronto')

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))

with psycopg.connect(env['POSTGRES_URL'], connect_timeout=30) as c:
    c.execute('set transaction read only')
    cols = ('id number created_at name email phone shipping delivery_method delivery_km delivery_warning '
            'subtotal shipping_total tax_total discount_total total promo_code note status emails_sent_at').split()
    where, args = ('where number = %s', [int(sys.argv[1])]) if len(sys.argv) > 1 else ('where livemode is true', [])
    rows = c.execute(f"select {', '.join(cols)} from orders {where} order by created_at desc limit 5", args).fetchall()
    if not rows:
        print('no orders found')
    for r in rows:
        o = dict(zip(cols, r))
        ship = o['shipping'] or {}
        addr = ship.get('address') if isinstance(ship, dict) else None
        print(f"\nORDER #{o['number']}  ·  {o['created_at'].astimezone(TZ):%a %b %d, %Y %I:%M %p} Toronto  ·  {o['status']}")
        print('Emails:   ' + (f"sent {o['emails_sent_at'].astimezone(TZ):%b %d %I:%M %p}" if o['emails_sent_at'] else 'NOT SENT'))
        print(f"Customer: {o['name'] or ''} · {o['email'] or ''} · {o['phone'] or ''}")
        method = {'pickup': 'Pickup (free)', 'london': 'Delivery, London (free)', 'extended': 'Delivery, 30-250 km'}.get(o['delivery_method'], o['delivery_method'])
        print(f"Delivery: {method}" + (f" · {o['delivery_km']} km from the studio" if o['delivery_km'] is not None else ''))
        if addr:
            print('Address:  ' + ', '.join(str(addr.get(k)) for k in ('line1', 'line2', 'city', 'state', 'postal_code') if addr.get(k)))
        if o['delivery_warning']:
            print(f"CHECK:    {o['delivery_warning']}")
        if o['note']:
            print(f"Note:     {o['note']}")
        items = c.execute('select title, variant_title, quantity, unit_price, addons_total, line_total, selections, uploads '
                          'from order_items where order_id = %s order by id', [o['id']]).fetchall()
        print('Items:')
        for t, v, q, up, add, lt, sel, ups in items:
            print(f"  {q} x {t}{' (' + v + ')' if v else ''}  ${lt}")
            for s in (sel or []):
                print(f"      {s.get('label') or s.get('key')}: {s.get('value')}" + (f"  (+${s.get('price')})" if s.get('price') else ''))
            for u in (ups or []):
                print(f"      upload: {u}")
        print(f"Subtotal ${o['subtotal']} · Delivery ${o['shipping_total']} · HST ${o['tax_total']}"
              + (f" · Discount -${o['discount_total']}" if o['discount_total'] else '')
              + (f" (code {o['promo_code']})" if o['promo_code'] else '') + f" · TOTAL ${o['total']}")
