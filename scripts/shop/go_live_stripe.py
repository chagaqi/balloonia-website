"""Switch the production shop to the live Stripe account. Run once, after DH has put the
live key in .env (never in chat, never in git):

  1) In your own PowerShell window (not through Claude):
       $k = Read-Host "Stripe live secret key"; Add-Content "C:\\Users\\dylan\\Documents\\axiom-balloon\\balloonia-website\\.env" "STRIPE_LIVE_SECRET_KEY=$k"
  2) python scripts/shop/go_live_stripe.py

What it does:
  - checks the key is a live key and the account can take payments
  - creates the live webhook endpoint https://balloonia.events/api/stripe-webhook
    (checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded)
  - writes STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to Vercel *Production* (sensitive),
    piping the values over stdin so they never appear on a command line or in output
The `shop` preview keeps the test keys. Nothing changes for shoppers until `shop` is merged
into `main`, because production still runs the old site until then.
"""
import json, os, re, subprocess, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(ROOT, '.env'), encoding='utf-8').read(), re.M))
key = (env.get('STRIPE_LIVE_SECRET_KEY') or '').strip().strip('"')
if not re.match(r'^(sk|rk)_live_[A-Za-z0-9]+$', key):
    sys.exit('STRIPE_LIVE_SECRET_KEY in .env is missing or is not a live key (sk_live_... or rk_live_...).')
H = {'Authorization': f'Bearer {key}', 'Stripe-Version': '2024-06-20'}
URL = 'https://balloonia.events/api/stripe-webhook'
EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'charge.refunded']


def stripe(method, path, data=None):
    body = urllib.parse.urlencode(data, doseq=True).encode() if data else None
    req = urllib.request.Request(f'https://api.stripe.com/v1/{path}', data=body, method=method, headers=H)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'Stripe {path}: {e.code} {json.loads(e.read() or b"{}").get("error", {}).get("message", "")}')


acct = stripe('GET', 'account')
print(f"Live account: {acct.get('settings', {}).get('dashboard', {}).get('display_name') or acct['id']} | "
      f"charges enabled: {acct.get('charges_enabled')} | payouts enabled: {acct.get('payouts_enabled')} | "
      f"default currency: {acct.get('default_currency')}")
if not acct.get('charges_enabled'):
    sys.exit('This account cannot take payments yet. Finish activation in the Stripe dashboard, then run this again.')

hooks = stripe('GET', 'webhook_endpoints?limit=100')['data']
existing = [w for w in hooks if w['url'] == URL]
if existing:
    sys.exit(f"A live webhook for {URL} already exists ({existing[0]['id']}). Stripe only shows its signing secret once: "
             'open it in the Stripe dashboard (Developers > Webhooks), click "Reveal" under Signing secret, and paste it into '
             'Vercel > balloonia-website > Settings > Environment Variables > STRIPE_WEBHOOK_SECRET (Production).')
hook = stripe('POST', 'webhook_endpoints', [('url', URL), ('api_version', '2024-06-20'),
                                            ('description', 'Balloonia shop orders (balloonia-website /api/stripe-webhook)')] +
             [('enabled_events[]', e) for e in EVENTS])
print(f"Created live webhook {hook['id']} for {URL}")


def vercel_set(name, value):
    r = subprocess.run(['vercel', 'env', 'add', name, 'production', '--force', '--yes'], input=value, text=True,
                       cwd=ROOT, capture_output=True, shell=(os.name == 'nt'))
    ok = r.returncode == 0
    print(f"Vercel Production {name}: {'saved' if ok else 'FAILED'}")
    if not ok:
        print((r.stderr or r.stdout)[-400:])
    return ok


ok = vercel_set('STRIPE_SECRET_KEY', key) & vercel_set('STRIPE_WEBHOOK_SECRET', hook['secret'])
print('Done. Production will use live Stripe from the next production deploy (the merge of shop into main).' if ok
      else 'Some values did not save; set them in the Vercel dashboard.')
