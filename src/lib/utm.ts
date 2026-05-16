// UTM capture: read from URL on first load, persist to sessionStorage,
// include in form submissions for attribution. Inline-loaded by BaseLayout.
//
// This module exports a small string for inlining and a helper for reading
// at submit time inside the quote form.

export const UTM_KEY = 'balloonia.utm';

export const KNOWN_UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export type UtmKey = (typeof KNOWN_UTM_KEYS)[number];
export type UtmValues = Partial<Record<UtmKey, string>>;

// String inlined in BaseLayout via set:html. Idempotent: merges new params,
// keeps the previously-stored campaign attribution if the current page
// has no fresh UTM params on it.
export const utmCaptureScript = `
(function(){
  try {
    var params = new URLSearchParams(window.location.search);
    var keys = ${JSON.stringify(KNOWN_UTM_KEYS)};
    var found = {};
    keys.forEach(function(k){ var v = params.get(k); if (v) found[k] = v; });
    if (Object.keys(found).length === 0) return;
    var raw = sessionStorage.getItem(${JSON.stringify(UTM_KEY)}) || '{}';
    var prev = {};
    try { prev = JSON.parse(raw); } catch (e) { prev = {}; }
    var merged = Object.assign({}, prev, found);
    sessionStorage.setItem(${JSON.stringify(UTM_KEY)}, JSON.stringify(merged));
  } catch (e) { /* no-op */ }
})();
`.trim();

export function readUtm(): UtmValues {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as UtmValues) : {};
  } catch {
    return {};
  }
}
