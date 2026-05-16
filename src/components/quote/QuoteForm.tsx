import { useEffect, useMemo, useState } from 'preact/hooks';
import type { QuoteData, StepKey, EventType, BudgetRange } from './types';
import { initialQuoteData } from './types';
import { validateStep, type StepErrors } from './validation';
import { loadDraft, saveDraft, submitQuote } from './submitQuote';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'event-type', label: 'Event type' },
  { key: 'event-date', label: 'Date' },
  { key: 'venue', label: 'Venue' },
  { key: 'budget', label: 'Budget' },
  { key: 'style', label: 'Style' },
  { key: 'contact', label: 'Contact' },
];

const EVENT_TYPES: EventType[] = ['Wedding', 'Shower', 'Birthday', 'Corporate', 'Graduation', 'Other'];

const BUDGET_OPTIONS: { value: BudgetRange; label: string }[] = [
  { value: 'under-300', label: 'Under $300' },
  { value: '300-1000', label: '$300 to $1,000' },
  { value: '1000-2500', label: '$1,000 to $2,500' },
  { value: '2500-plus', label: '$2,500+' },
  { value: 'not-sure', label: 'Not sure yet' },
];

type Props = {
  initialEventType?: EventType;
};

export default function QuoteForm({ initialEventType }: Props) {
  const [data, setData] = useState<QuoteData>(initialQuoteData);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; mailtoHref: string } | null>(null);

  // Hydrate from query string + draft on mount.
  useEffect(() => {
    const draft = loadDraft();
    setData((prev) => {
      const next = { ...prev };
      if (draft) Object.assign(next, draft);
      if (initialEventType && !next.eventType) next.eventType = initialEventType;
      // Pick up event_type from query (?type=Wedding) for ICP-page deep links.
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('type');
        if (t && !next.eventType && EVENT_TYPES.includes(t as EventType)) {
          next.eventType = t as EventType;
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, [initialEventType]);

  // Persist draft on every change after mount.
  useEffect(() => {
    saveDraft(data);
  }, [data]);

  const step = STEPS[stepIndex];
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function update<K extends keyof QuoteData>(key: K, value: QuoteData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  function next() {
    const stepErrors = validateStep(step.key, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function prev() {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onSubmit() {
    const stepErrors = validateStep(step.key, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitQuote(data);
    setSubmitting(false);
    if (result.ok) {
      window.location.assign('/quote/thanks');
    } else {
      setSubmitError({ message: result.error, mailtoHref: result.mailtoHref });
    }
  }

  const isLast = stepIndex === STEPS.length - 1;
  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <div class="quote-form">
      <header class="quote-progress">
        <p class="step-label">
          Step {stepIndex + 1} of {STEPS.length}: <strong>{step.label}</strong>
        </p>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <div class="quote-layout">
        <aside class="quote-stepper" aria-label="Form progress">
          <ol>
            {STEPS.map((s, i) => {
              const completed = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li class={`stepper-item ${current ? 'current' : ''} ${completed ? 'completed' : ''}`}>
                  <button
                    type="button"
                    onClick={() => completed && setStepIndex(i)}
                    disabled={!completed}
                    aria-current={current ? 'step' : undefined}
                  >
                    <span class="stepper-num">{i + 1}</span>
                    <span class="stepper-label">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section class="quote-step" aria-live="polite">
          {step.key === 'event-type' && (
            <fieldset>
              <legend>What kind of event are you planning?</legend>
              <div class="option-grid">
                {EVENT_TYPES.map((t) => (
                  <label class={`option ${data.eventType === t ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="eventType"
                      value={t}
                      checked={data.eventType === t}
                      onChange={() => update('eventType', t)}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
              {errors.eventType && <p class="field-error">{errors.eventType}</p>}
            </fieldset>
          )}

          {step.key === 'event-date' && (
            <div class="field">
              <label htmlFor="event-date-input">When is the event?</label>
              <input
                id="event-date-input"
                type="date"
                min={minDate}
                value={data.eventDate}
                onInput={(e) => update('eventDate', (e.currentTarget as HTMLInputElement).value)}
              />
              <p class="hint">If the date is flexible, pick the earliest you'd consider.</p>
              {errors.eventDate && <p class="field-error">{errors.eventDate}</p>}
            </div>
          )}

          {step.key === 'venue' && (
            <div class="field-stack">
              <div class="field">
                <label htmlFor="venue-name">Venue name</label>
                <input
                  id="venue-name"
                  type="text"
                  value={data.venueName}
                  onInput={(e) => update('venueName', (e.currentTarget as HTMLInputElement).value)}
                  placeholder="The Western Fair District, your backyard, the office..."
                />
                {errors.venueName && <p class="field-error">{errors.venueName}</p>}
              </div>
              <div class="field">
                <label htmlFor="venue-city">City</label>
                <input
                  id="venue-city"
                  type="text"
                  value={data.city}
                  onInput={(e) => update('city', (e.currentTarget as HTMLInputElement).value)}
                />
                {errors.city && <p class="field-error">{errors.city}</p>}
              </div>
            </div>
          )}

          {step.key === 'budget' && (
            <fieldset>
              <legend>What budget are you working with?</legend>
              <div class="option-list">
                {BUDGET_OPTIONS.map((opt) => (
                  <label class={`option-row ${data.budgetRange === opt.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="budgetRange"
                      value={opt.value}
                      checked={data.budgetRange === opt.value}
                      onChange={() => update('budgetRange', opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              {errors.budgetRange && <p class="field-error">{errors.budgetRange}</p>}
            </fieldset>
          )}

          {step.key === 'style' && (
            <div class="field-stack">
              <div class="field">
                <label htmlFor="style-text">Style, theme, or color palette</label>
                <textarea
                  id="style-text"
                  rows={4}
                  value={data.styleText}
                  onInput={(e) => update('styleText', (e.currentTarget as HTMLTextAreaElement).value)}
                  placeholder="Boho with pampas grass, cream and blush balloons, minimal and editorial..."
                />
                <p class="hint">Optional, but specifics help Brenda quote accurately.</p>
              </div>
              <div class="field">
                <label htmlFor="style-link">Pinterest board or Instagram saves link</label>
                <input
                  id="style-link"
                  type="url"
                  value={data.styleLink}
                  onInput={(e) => update('styleLink', (e.currentTarget as HTMLInputElement).value)}
                  placeholder="https://pin.it/..."
                />
                <p class="hint">If you have an inspiration board, paste the link.</p>
              </div>
            </div>
          )}

          {step.key === 'contact' && (
            <div class="field-stack">
              <div class="field-row">
                <div class="field">
                  <label htmlFor="first-name">First name</label>
                  <input
                    id="first-name"
                    type="text"
                    value={data.firstName}
                    onInput={(e) => update('firstName', (e.currentTarget as HTMLInputElement).value)}
                  />
                  {errors.firstName && <p class="field-error">{errors.firstName}</p>}
                </div>
                <div class="field">
                  <label htmlFor="last-name">Last name</label>
                  <input
                    id="last-name"
                    type="text"
                    value={data.lastName}
                    onInput={(e) => update('lastName', (e.currentTarget as HTMLInputElement).value)}
                  />
                  {errors.lastName && <p class="field-error">{errors.lastName}</p>}
                </div>
              </div>
              <div class="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={data.email}
                  onInput={(e) => update('email', (e.currentTarget as HTMLInputElement).value)}
                />
                {errors.email && <p class="field-error">{errors.email}</p>}
              </div>
              <div class="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={data.phone}
                  onInput={(e) => update('phone', (e.currentTarget as HTMLInputElement).value)}
                />
                {errors.phone && <p class="field-error">{errors.phone}</p>}
              </div>
              {submitError && (
                <div class="submit-error" role="alert">
                  <p><strong>We couldn't send that.</strong> Please email us instead.</p>
                  <p class="submit-error-detail">{submitError.message}</p>
                  <a class="submit-mailto" href={submitError.mailtoHref}>Email Brenda directly</a>
                </div>
              )}
            </div>
          )}

          <div class="quote-nav">
            {stepIndex > 0 && (
              <button type="button" class="nav-btn nav-btn-back" onClick={prev}>
                Back
              </button>
            )}
            {!isLast && (
              <button type="button" class="nav-btn nav-btn-next" onClick={next}>
                Next
              </button>
            )}
            {isLast && (
              <button
                type="button"
                class="nav-btn nav-btn-submit"
                onClick={onSubmit}
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Submit request'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
