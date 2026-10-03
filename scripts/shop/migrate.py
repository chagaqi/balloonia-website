"""Apply supabase/migrations/*.sql in order to the Supabase Postgres in .env (POSTGRES_URL).
Idempotent: every statement uses IF NOT EXISTS. Usage: python scripts/shop/migrate.py
"""
import glob, os, re, psycopg
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', open(os.path.join(root, '.env'), encoding='utf-8').read(), re.M))
with psycopg.connect(env['POSTGRES_URL'], connect_timeout=20) as conn:
    for f in sorted(glob.glob(os.path.join(root, 'supabase', 'migrations', '*.sql'))):
        conn.execute(open(f, encoding='utf-8').read())
        print('applied', os.path.basename(f))
    conn.commit()
    n = conn.execute("select count(*) from information_schema.tables where table_schema='public'").fetchone()[0]
    print('public tables now:', n)
