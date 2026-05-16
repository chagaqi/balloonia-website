export type EventType = 'Wedding' | 'Shower' | 'Birthday' | 'Corporate' | 'Graduation' | 'Other';
export type BudgetRange = 'under-300' | '300-1000' | '1000-2500' | '2500-plus' | 'not-sure';

export type QuoteData = {
  eventType: EventType | '';
  eventDate: string;
  venueName: string;
  city: string;
  budgetRange: BudgetRange | '';
  styleText: string;
  styleLink: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type StepKey = 'event-type' | 'event-date' | 'venue' | 'budget' | 'style' | 'contact';

export const initialQuoteData: QuoteData = {
  eventType: '',
  eventDate: '',
  venueName: '',
  city: 'London',
  budgetRange: '',
  styleText: '',
  styleLink: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

export type SubmitResult =
  | { ok: true; mode: 'mock' | 'live' }
  | { ok: false; error: string; mailtoHref: string };
