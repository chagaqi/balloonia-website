// Watchdog for the call -> Telegram lead pipeline.
//
// The pipeline's failure mode is silence. Twice now it has been dead for days
// with nothing broken on our side at all: once the webhook was registered
// against a hostname that redirects, once the registration was gone from Quo
// entirely. In both cases every component here was healthy, no error was
// logged anywhere, and we only found out because someone noticed the packets
// had stopped. Calls are sporadic enough that "it has been quiet" is not a
// signal, so something has to go looking on purpose.
//
// Run this on a schedule. It reads the same health report the webhook serves
// and messages DH ONLY when something is actually wrong, so a silent watchdog
// means a working pipeline.
//
//   GET /api/quo-watchdog          - check, alert only on failure
//   GET /api/quo-watchdog?force=1  - alert regardless, to prove the path works
//
// Wire it to any scheduler that can make an HTTP request once a day.

import { healthReport, sendTelegram } from './quo-webhook';

export const config = { runtime: 'edge' };

type Health = {
  env?: Record<string, boolean>;
  self?: { verdict?: string };
  telegram?: { verdict?: string; bot?: string };
  quo?: { verdict?: string };
};

export default async function handler(req: Request): Promise<Response> {
  const force = new URL(req.url).searchParams.get('force') === '1';

  // The report is about the webhook endpoint, not about this one.
  const webhookUrl = new URL('/api/quo-webhook', req.url);
  const health = (await healthReport(webhookUrl)) as Health;

  const problems: string[] = [];

  const missing = Object.entries(health.env || {})
    .filter(([, present]) => !present)
    .map(([name]) => name);
  if (missing.length) problems.push(`Missing env vars: ${missing.join(', ')}`);

  if (health.self?.verdict && health.self.verdict !== 'reachable') {
    problems.push(`Endpoint: ${health.self.verdict}`);
  }
  if (health.telegram?.verdict && health.telegram.verdict !== 'ok') {
    problems.push(`Telegram: ${health.telegram.verdict}`);
  }
  // Only a verdict we can stand behind counts as a problem. The Quo list API
  // has reported nothing while a webhook was registered and firing, so an
  // UNKNOWN there is a gap in our visibility, not a broken pipeline, and
  // paging DH about it every day would train him to ignore this alert.
  const quoVerdict = health.quo?.verdict;
  if (quoVerdict && quoVerdict.startsWith('BROKEN')) {
    problems.push(`Quo: ${quoVerdict}`);
  }

  if (!problems.length && !force) {
    return new Response(JSON.stringify({ ok: true, alerted: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Alerts go to DH only. Brenda gets lead packets, not plumbing.
  const dh = process.env.DH_CHAT_ID?.trim();
  if (!dh) {
    return new Response(JSON.stringify({ ok: false, problems, alerted: false, reason: 'DH_CHAT_ID missing' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const message = [
    problems.length ? '🚨 LEAD PIPELINE IS DOWN' : '✅ Lead pipeline check (forced)',
    '',
    problems.length ? 'Calls are not reaching Telegram:' : 'No problems found. This is a forced test.',
    ...problems.map((p) => `• ${p}`),
    '',
    `Full report: ${webhookUrl.origin}/api/quo-webhook?health=1`,
  ].join('\n');

  const delivered = await sendTelegram(dh, message).catch(() => false);

  return new Response(JSON.stringify({ ok: !problems.length, problems, alerted: delivered }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
