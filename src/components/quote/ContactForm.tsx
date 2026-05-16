import { useState } from 'preact/hooks';
import { readUtm } from '../../lib/utm';

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; mailtoHref: string; message: string };

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  function buildPayload() {
    const utm = readUtm();
    return {
      event_type: '',
      event_date: '',
      venue_name: '',
      city: 'London',
      budget_range: '',
      style_or_theme: message.trim(),
      first_name: name.split(' ').slice(0, -1).join(' ') || name,
      last_name: name.split(' ').slice(-1).join(' ') || '',
      email,
      phone: '',
      utm_source: utm.utm_source ?? '',
      utm_medium: utm.utm_medium ?? '',
      utm_campaign: utm.utm_campaign ?? '',
    };
  }

  function buildMailto(payload: ReturnType<typeof buildPayload>) {
    const body = `From: ${payload.first_name} ${payload.last_name} <${payload.email}>\n\n${payload.style_or_theme}`;
    return `mailto:contact@balloonia.events?subject=${encodeURIComponent('Website message')}&body=${encodeURIComponent(body)}`;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    const payload = buildPayload();
    const mode = import.meta.env.PUBLIC_SUBMIT_MODE === 'live' ? 'live' : 'mock';

    setState({ kind: 'submitting' });

    if (mode === 'mock') {
      // eslint-disable-next-line no-console
      console.log('[balloonia contact] mock submit payload:', payload);
      setState({ kind: 'success' });
      setName('');
      setEmail('');
      setMessage('');
      return;
    }

    try {
      const res = await fetch(import.meta.env.PUBLIC_ZAPIER_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
      setState({ kind: 'success' });
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setState({
        kind: 'error',
        mailtoHref: buildMailto(payload),
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
