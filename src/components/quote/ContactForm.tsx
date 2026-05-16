import { useState } from 'preact/hooks';

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; mailtoHref: string; message: string };

// Posts to our Vercel serverless function (/api/contact), which sends via Resend
// from noreply@mail.balloonia.events to contact@balloonia.events.
const CONTACT_ENDPOINT = '/api/contact';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  function buildMailto() {
    const body = `From: ${name} <${email}>\n\n${message}`;
    return `mailto:contact@balloonia.events?subject=${encodeURIComponent('Website message')}&body=${encodeURIComponent(body)}`;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setState({ kind: 'submitting' });

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
        throw new Error(err.error || `Server returned ${res.status}`);
      }
      setState({ kind: 'success' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setState({
        kind: 'error',
        mailtoHref: buildMailto(),
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  if (state.kind === 'success') {
    return (
      <div class="contact-success" role="status">
        <p><strong>Got it.</strong> Brenda will be in touch within 24 hours.</p>
      </div>
    );
  }

  return (
    <form class="contact-form" onSubmit={onSubmit}>
      <div class="field">
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div class="field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      <div class="field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          rows={4}
          required
          value={message}
          onInput={(e) => setMessage((e.currentTarget as HTMLTextAreaElement).value)}
        />
      </div>
      {state.kind === 'error' && (
        <div class="submit-error" role="alert">
          <p><strong>We couldn't send that.</strong> Please email us directly.</p>
          <a class="submit-mailto" href={state.mailtoHref}>Email Brenda directly</a>
        </div>
      )}
      <button type="submit" class="nav-btn nav-btn-next" disabled={state.kind === 'submitting'}>
        {state.kind === 'submitting' ? 'Sending...' : 'Send message'}
      </button>
    </form>
  );
}
