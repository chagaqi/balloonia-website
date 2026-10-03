// Dev-only Astro integration: serves the Vercel functions in /api from `astro dev`,
// so the cart, uploads and checkout can be tested locally without `vercel dev`.
// Production is untouched (Vercel runs /api itself). Secrets come from .env, plus an
// optional extra env file named by DEV_API_ENV_FILE (e.g. a `vercel env pull` output
// kept outside the repo).
import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(file) {
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

export default function devApi() {
  return {
    name: 'balloonia-dev-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const root = server.config.root;
        loadEnvFile(path.join(root, '.env'));
        loadEnvFile(process.env.DEV_API_ENV_FILE);
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url, 'http://localhost');
          const m = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname);
          if (!m) return next();
          const file = path.join(root, 'api', `${m[1]}.ts`);
          if (!fs.existsSync(file)) return next();
          try {
            const mod = await server.ssrLoadModule(file);
            const chunks = [];
            for await (const c of req) chunks.push(c);
            const body = chunks.length ? Buffer.concat(chunks) : undefined;
            const request = new Request(`http://${req.headers.host}${req.url}`, {
              method: req.method,
              headers: req.headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
            });
            const response = await mod.default(request);
            res.statusCode = response.status;
            response.headers.forEach((v, k) => res.setHeader(k, v));
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (err) {
            console.error('[dev-api]', m[1], err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      },
    },
  };
}
