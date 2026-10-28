// Opens (or finds) the job for an inquiry in the dashboard's Jobs hub.
// Env (Vercel): JOBS_INTAKE_URL = https://<dashboard>/api/jobs-intake, JOBS_INTAKE_SECRET.
// Unset = skip quietly. A failure is logged and never breaks the caller: the email, the
// Telegram ping and the order itself always go out first.

export type JobIntake = {
  source: 'Website' | 'Call' | 'Shop' | 'HoneyBook' | 'Email' | 'Text' | 'Instagram' | 'Referral' | 'Other';
  external_id: string;
  number?: string;
  client?: string;
  company?: string;
  email?: string | null;
  phone?: string | null;
  event_date?: string;
  start_time?: string;
  venue?: string;
  address?: string;
  delivery_type?: 'Install' | 'Delivery' | 'Pickup';
  pieces?: string;
  colours?: string;
  notes?: string;
  uploads?: string;
  quote_total?: number;
  paid_in_full?: boolean;
  notify?: boolean;
};

export async function sendToJobs(body: JobIntake, timeoutMs = 6000): Promise<{ url?: string; recordId?: string } | null> {
  const url = (process.env.JOBS_INTAKE_URL || '').trim();
  const secret = (process.env.JOBS_INTAKE_SECRET || '').trim();
  if (!url || !secret) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        // Cloudflare's browser check turns away bare library user agents (error 1010).
        'User-Agent': 'Mozilla/5.0 (compatible; BallooniaWebsite/1.0; +https://balloonia.events)',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      console.error('jobs intake', r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const j = (await r.json()) as { url?: string; job?: { recordId?: string } };
    return { url: j.url, recordId: j.job?.recordId };
  } catch (err) {
    console.error('jobs intake failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Short stable id from text, so a double-submitted form opens one job, not two.
export async function shortHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}
