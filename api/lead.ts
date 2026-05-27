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

  const apiKey = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.RESEND_API_KEY;
  const fromAddress = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LEAD_FROM_ADDRESS
    || 'Balloonia Events <hello@mail.balloonia.events>';
  const replyTo = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.LEAD_REPLY_TO
    || 'contact@balloonia.events';

  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return json({ error: 'Server misconfigured' }, 500);
  }

  // ----------------------------------------------------------------------
  // Email content. EDIT subject + html below.
  // The {{vars}} are substituted from the form data.
  // ----------------------------------------------------------------------
  const subject = '[Email subject — e.g. Thanks for reaching out, {{name}}]';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <p>[Email greeting line — e.g. Hi {{name}}]</p>
      <p>[Welcome paragraph — thank them for reaching out]</p>
      <p>[Booking link line — e.g. Pick a time that works here: <a href="[YOUR_CAL_OR_HONEYBOOK_URL]">[YOUR_CAL_OR_HONEYBOOK_URL]</a>]</p>
      <p>[Alternative — invite them to reply with a time that works best]</p>
      <p>[Signoff — e.g. Brenda]</p>
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
    return json({ error: 'Email send failed', resendStatus: resendRes.status, resendBody: errText }, 502);
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
