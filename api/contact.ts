// Vercel serverless function. Receives contact-form POSTs and emails them via Resend.
// Sender: noreply@mail.balloonia.events (Resend-verified subdomain)
// Recipient: contact@balloonia.events

import { Resend } from 'resend';

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
};

export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const message = (body.message || '').trim();

  if (!name || !email || !message) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json({ error: 'Email service not configured' }, 500);
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: 'Balloonia Website <noreply@mail.balloonia.events>',
      to: ['contact@balloonia.events'],
      replyTo: email,
      subject: `Website message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <table style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.5; color: #222;">
          <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
          <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="vertical-align: top;"><strong>Message</strong></td><td style="white-space: pre-wrap;">${escapeHtml(message)}</td></tr>
        </table>
      `,
    });
    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed';
    return json({ error: msg }, 502);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
