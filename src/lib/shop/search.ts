// Browser search over /search-index.json (built at deploy time). Shared by the
// header's predictive dropdown and the /search results page.
import MiniSearch from 'minisearch';
import type { SearchDoc } from './types';

let loading: Promise<{ engine: MiniSearch<SearchDoc>; docs: Map<number, SearchDoc> }> | null = null;

export function loadSearch() {
  if (!loading) {
    loading = fetch('/search-index.json', { cache: 'force-cache' })
      .then((r) => r.json() as Promise<SearchDoc[]>)
      .then((list) => {
        const engine = new MiniSearch<SearchDoc>({
          fields: ['t', 'ty', 'tg', 'v', 'd'],
          storeFields: ['id'],
          searchOptions: {
            boost: { t: 4, ty: 2, tg: 2, v: 1.5, d: 0.6 },
            prefix: true,
            fuzzy: (term) => (term.length > 4 ? 0.2 : false),
            combineWith: 'AND',
          },
        });
        engine.addAll(list);
        return { engine, docs: new Map(list.map((d) => [d.id, d])) };
      });
    loading.catch(() => {
      loading = null;
    });
  }
  return loading;
}

export async function search(q: string, limit = 250): Promise<SearchDoc[]> {
  const term = q.trim();
  if (!term) return [];
  const { engine, docs } = await loadSearch();
  let hits = engine.search(term);
  if (!hits.length) hits = engine.search(term, { combineWith: 'OR' });
  return hits.slice(0, limit).map((h) => docs.get(h.id as number)!).filter(Boolean);
}

export function moneyCad(d: SearchDoc): string {
  const n = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.p);
  return `${d.pv ? 'From ' : ''}$${n} CAD`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
