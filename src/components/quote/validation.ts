import type { QuoteData, StepKey } from './types';

export type StepErrors = Partial<Record<keyof QuoteData, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\-\s\d]{7,}$/;

export function validateStep(step: StepKey, data: QuoteData): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'event-type':
      if (!data.eventType) errors.eventType = 'Pick the event type that fits best.';
      break;
    case 'event-date':
      if (!data.eventDate) {
        errors.eventDate = 'Pick a date so we can check availability.';
      } else if (new Date(data.eventDate) < new Date(new Date().toDateString())) {
        errors.eventDate = 'Pick a date in the future.';
      }
      break;
    case 'venue':
      if (!data.venueName.trim()) errors.venueName = 'Venue name helps us plan setup logistics.';
      if (!data.city.trim()) errors.city = 'City helps us check travel time.';
      break;
    case 'budget':
      if (!data.budgetRange) errors.budgetRange = 'Pick a range. "Not sure" is a real answer.';
      break;
    case 'style':
      // Style and link are both optional.
      break;
    case 'contact':
      if (!data.firstName.trim()) errors.firstName = 'First name, please.';
      if (!data.lastName.trim()) errors.lastName = 'Last name, please.';
      if (!data.email.trim() || !EMAIL.test(data.email)) errors.email = 'A working email so Brenda can reply.';
      if (!data.phone.trim() || !PHONE.test(data.phone)) errors.phone = 'A phone number, in any format.';
      break;
  }
  return errors;
}

export function isStepValid(step: StepKey, data: QuoteData): boolean {
  return Object.keys(validateStep(step, data)).length === 0;
}
