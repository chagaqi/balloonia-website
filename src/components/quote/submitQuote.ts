import { readUtm } from '../../lib/utm';
import type { QuoteData, SubmitResult } from './types';

const DRAFT_KEY = 'balloonia.quote.draft';

export function composeStyleField(text: string, link: string): string {
  const parts: string[] = [];
  if (text.trim()) parts.push(text.trim());
  if (link.trim()) parts.push(`links: ${link.trim()}`);
  return parts.join(' | ');
}

export function buildPayload(data: QuoteData) {
  const utm = readUtm();
  return {
    event_type: data.eventType || '',
    event_date: data.eventDate || '',
    venue_name: data.venueName || '',
    city: data.city || 'London',
    budget_range: data.budgetRange || '',
    style_or_theme: composeStyleField(data.styleText, data.styleLink),
    first_name: data.firstName || '',
    last_name: data.lastName || '',
    email: data.email || '',
    phone: data.phone || '',
    utm_source: utm.utm_source ?? '',
    utm_medium: utm.utm_medium ?? '',
    utm_campaign: utm.utm_campaign ?? '',
  } as const;
}

function buildMailto(payload: ReturnType<typeof buildPayload>) {
  const subject = `Quote request: ${payload.event_type || 'event'} on ${payload.event_date || 'TBD'}`;
  const body = Object.entries(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return `mailto:contact@balloonia.events?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function submitQuote(data: QuoteData): Promise<SubmitResult> {
  const payload = buildPayload(data);
  const mode = import.meta.env.PUBLIC_SUBMIT_MODE === 'live' ? 'live' : 'mock';

  if (mode === 'mock') {
    // eslint-disable-next-line no-console
    console.log('[balloonia quote] mock submit payload:', payload);
    clearDraft();
    return { ok: true, mode: 'mock' };
  }

  const url = import.meta.env.PUBLIC_ZAPIER_WEBHOOK;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status}`);
    }
    clearDraft();
    return { ok: true, mode: 'live' };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
      mailtoHref: buildMailto(payload),
    };
  }
}

export function loadDraft(): Partial<QuoteData> | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.savedAt) {
      const age = Date.now() - parsed.savedAt;
      if (age > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return parsed.data as Partial<QuoteData>;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(data: QuoteData): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // storage full or disabled, drop silently
  }
}

export function clearDraft(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // no-op
  }
}
