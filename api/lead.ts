// Lead capture endpoint. Receives POST from the LeadCaptureModal.
// Sends an auto-reply welcome email via Resend.
//
// Env vars (Vercel project settings):
//   RESEND_API_KEY       — your Resend API key (already set up for mail.balloonia.events)
//   LEAD_FROM_ADDRESS    — verified sender, e.g. "Balloonia Events <hello@mail.balloonia.events>"
//   LEAD_REPLY_TO        — where prospect replies route, e.g. "contact@balloonia.events"
//
// Native Vercel function (not an Astro route). Deploys automatically as
// /api/lead.

export const config = { runtime: 'edge' };

interface LeadPayload {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let data: LeadPayload;
  try {
    data = (await req.json()) as LeadPayload;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const source = (data.source || '').trim();

  if (!name || !email || !phone) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // Basic email shape check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email' }, 400);
  }

  // Read env vars defensively. Vercel sometimes wraps user-entered values in quotes.
  const cleanEnv = (v: string | undefined): string => (v || '').trim().replace(/^['"](.+)['"]$/, '$1').trim();
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  let fromAddress = cleanEnv(process.env.LEAD_FROM_ADDRESS) || 'Balloonia Events <hello@mail.balloonia.events>';
  const replyTo = cleanEnv(process.env.LEAD_REPLY_TO) || 'contact@balloonia.events';

  // Validate FROM format. Accept either `email@x.com` or `Name <email@x.com>`.
  // If invalid, fall back to the known-good default so we never break on a misconfigured env var.
  const fromValid = /^([^<>]+<[^\s<>]+@[^\s<>]+>|[^\s<>]+@[^\s<>]+)$/.test(fromAddress);
  if (!fromValid) {
    fromAddress = 'Balloonia Events <hello@mail.balloonia.events>';
  }

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return json({ error: 'Server misconfigured' }, 500);
  }

  // ----------------------------------------------------------------------
  // Email content. {{vars}} are substituted from form data. [YOUR_BOOKING_URL]
  // is the call-booking link — replace with Cal.com / HoneyBook scheduler URL.
  // ----------------------------------------------------------------------
  const subject = 'your event blueprint + free render 🎈';

  const bookingUrl = cleanEnv(process.env.LEAD_BOOKING_URL) || 'https://ballooniaevents.hbportal.co/public/schedulenow';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6; font-size: 16px;">
      <p>Hey {{name}},</p>
      <p>Thanks for reaching out! We are excited to help you make your next listing unforgettable.</p>
      <p>We want to make this completely effortless for you, so let us get right to the fun part. To get your free custom design render, just do one of two things:</p>
      <ol style="padding-left: 1.25em; margin: 0 0 1em 0;">
        <li style="margin-bottom: 0.6em;">Reply directly to this email and drop a few quick details about your upcoming event (date, venue location, or a link to the listing).</li>
        <li><a href="${bookingUrl}" style="color: #1c3d34; font-weight: 600;">Click here to lock in your quick 15-minute blueprint call</a> so we can chat details and map out the concept together.</li>
      </ol>
      <p>There is absolute zero obligation, no deposit required, and we will handle everything from design to the late-night cleanup.</p>
      <p>Let's pack your next open house!</p>
      <p style="margin-bottom: 0;">Best,</p>
      <p style="margin-top: 0;"><strong>Brenda</strong><br/>Balloonia Events</p>
      <hr style="border: 0; border-top: 1px solid #e8e3da; margin: 24px 0;" />
      <p style="font-size: 12px; color: #6b6b6b;">
        Phone: <a href="tel:+12262422244" style="color: #1c3d34;">(226) 242-2244</a><br/>
        Reply to this email and Brenda will see it.
      </p>
    </div>
  `
    .replace(/\{\{name\}\}/g, escapeHtml(name))
    .replace(/\{\{email\}\}/g, escapeHtml(email))
    .replace(/\{\{phone\}\}/g, escapeHtml(phone));

  const subjectFilled = subject.replace(/\{\{name\}\}/g, name);

  // Send via Resend REST API
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
      subject: subjectFilled,
      html,
      // Tag for filtering in Resend dashboard
      tags: [
        { name: 'kind', value: 'lead_welcome' },
        { name: 'source', value: source.replace(/[^a-z0-9_-]/gi, '_') || 'unknown' },
      ],
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error('Resend send failed:', resendRes.status, errText);
    return json({ error: 'Email send failed' }, 502);
  }

  return json({ ok: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
