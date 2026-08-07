// Side-hustle guide opt-in endpoint. Receives POST from /side-hustle-guide.
//
// Order matters (review finding): capture the lead FIRST, then attempt delivery,
// and never block the user's instant access on the email succeeding. A Resend
// outage should cost us a delayed email, not a lost subscriber.
//
// Env vars (Vercel project settings):
//   RESEND_API_KEY          — already set (used by /api/lead)
//   LEAD_FROM_ADDRESS       — already set, verified sender
//   LEAD_REPLY_TO           — already set
//   CUSTOMERIO_SITE_ID      — optional, Track API site id (enables list sync)
//   CUSTOMERIO_TRACK_KEY    — optional, Track API key
//
// Native Vercel function, deploys as /api/guide.

export const config = { runtime: 'edge' };

interface GuidePayload {
  email?: string;
  source?: string;
  website?: string; // honeypot — real users never fill this
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const cleanEnv = (v: string | undefined): string =>
  (v || '').trim().replace(/^['"](.+)['"]$/, '$1').trim();

const GUIDE_URL = 'https://balloonia.events/guide/balloon-side-hustle';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let data: GuidePayload;
  try {
    data = (await req.json()) as GuidePayload;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Honeypot: pretend success, do nothing.
  if ((data.website || '').trim() !== '') {
    return json({ ok: true });
  }

  const email = (data.email || '').trim().toLowerCase();
  const source = (data.source || 'side-hustle-lp').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 400);
  }

  // ---- 1. Capture the lead (before any delivery attempt) -------------------
  const cioSite = cleanEnv(process.env.CUSTOMERIO_SITE_ID);
  const cioKey = cleanEnv(process.env.CUSTOMERIO_TRACK_KEY);
  if (cioSite && cioKey) {
    try {
      await fetch(`https://track.customer.io/api/v1/customers/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${btoa(`${cioSite}:${cioKey}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          guide_optin: true,
          optin_source: source,
          created_at: Math.floor(Date.now() / 1000),
        }),
      });
    } catch (e) {
      console.error('Customer.io capture failed (non-blocking):', e);
    }
  }

  // ---- 2. Attempt delivery email. Failure logs, never blocks access. -------
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  let fromAddress = cleanEnv(process.env.LEAD_FROM_ADDRESS) || 'Balloonia Events <hello@mail.balloonia.events>';
  const replyTo = cleanEnv(process.env.LEAD_REPLY_TO) || 'contact@balloonia.events';
  const fromValid = /^([^<>]+<[^\s<>]+@[^\s<>]+>|[^\s<>]+@[^\s<>]+)$/.test(fromAddress);
  if (!fromValid) fromAddress = 'Balloonia Events <hello@mail.balloonia.events>';

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — opt-in captured, no delivery email sent');
    return json({ ok: true });
  }

  const text = [
    'Here it is:',
    '',
    `Read the Balloon Side Hustle Starter Guide: ${GUIDE_URL}`,
    '',
    'It covers the $150 starter kit, your first three builds in the right order, how to price from day one, and the three free channels we would use to land a first paying client. The studio prices in it are the ones we publish and charge.',
    '',
    'Tip: the guide prints clean, so if you want a PDF copy, open it and hit print.',
    '',
    'Once in a while we will send a build tip or a pricing lesson from the studio. When we publish the full playbook of how this business runs, you will hear it here first.',
    '',
    'Go build the first garland,',
    'Brenda',
    'Balloonia Events · 412 Newbold St, Unit 4, London ON, Canada',
    '',
    `To unsubscribe, reply with the word "unsubscribe" and we will take you off the same day.`,
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6; font-size: 16px;">
      <p>Here it is:</p>
      <p style="margin: 20px 0;">
        <a href="${GUIDE_URL}" style="display: inline-block; background: #1c3d34; color: #ffffff; padding: 12px 22px; border-radius: 999px; font-weight: 600; text-decoration: none;">Read the Balloon Side Hustle Starter Guide</a>
      </p>
      <p style="font-size: 14px; color: #6b6b6b; margin-top: -8px;">Or copy the link: <a href="${GUIDE_URL}" style="color: #1c3d34;">${GUIDE_URL}</a></p>
      <p>It covers the $150 starter kit, your first three builds in the right order, how to price from day one, and the three free channels we would use to land a first paying client. The studio prices in it are the ones we publish and charge.</p>
      <p>Tip: the guide prints clean, so if you want a PDF copy, open it and hit print.</p>
      <p>Once in a while we will send a build tip or a pricing lesson from the studio. When we publish the full playbook of how this business runs, you will hear it here first.</p>
      <p style="margin-bottom: 0;">Go build the first garland,</p>
      <p style="margin-top: 0;"><strong>Brenda</strong><br/>Balloonia Events · 412 Newbold St, Unit 4, London ON, Canada</p>
      <hr style="border: 0; border-top: 1px solid #e8e3da; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b6b6b;">
        To unsubscribe, <a href="mailto:contact@balloonia.events?subject=unsubscribe" style="color: #1c3d34;">reply with the word unsubscribe</a> and we will take you off the same day.
      </p>
    </div>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        reply_to: replyTo,
        subject: 'your balloon side hustle starter guide',
        html,
        text,
        headers: {
          'List-Unsubscribe': '<mailto:contact@balloonia.events?subject=unsubscribe>',
        },
        tags: [
          { name: 'kind', value: 'guide_optin' },
          { name: 'source', value: source.replace(/[^a-z0-9_-]/gi, '_') || 'unknown' },
        ],
      }),
    });
    if (!resendRes.ok) {
      console.error('Resend send failed (non-blocking):', resendRes.status, await resendRes.text());
    }
  } catch (e) {
    console.error('Resend request threw (non-blocking):', e);
  }

  return json({ ok: true });
}
