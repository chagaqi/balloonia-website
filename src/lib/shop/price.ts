// Option-set logic shared by the product page island and /api/checkout.
// The server reruns the same functions on its own copy of the catalog, so the
// browser's numbers are only ever a preview.

import type { Field, FieldOption, OptionSet, Selection, UploadValue, Values } from './types';

export const cents = (n: number) => Math.round(n * 100);
export const fromCents = (c: number) => Math.round(c) / 100;

const moneyFmt = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Shopify's money format on this store: "$1,297.00". Cards add " CAD".
export function money(n: number): string {
  return '$' + moneyFmt.format(n);
}

function isUpload(v: unknown): v is UploadValue {
  return !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as UploadValue).path === 'string';
}

function hasValue(v: Values[string]): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (isUpload(v)) return !!v.path;
  return String(v).trim() !== '';
}

// A field is shown when it has no condition, or its parent is shown and holds the
// matching value. Hidden fields are neither priced, stored, nor validated.
export function isVisible(field: Field, values: Values, fields: Field[], depth = 0): boolean {
  if (!field.showWhen || depth > 10) return true;
  const parent = fields.find((f) => f.id === field.showWhen!.field);
  if (!parent) return true;
  if (!isVisible(parent, values, fields, depth + 1)) return false;
  const v = values[parent.id];
  if (Array.isArray(v)) return v.includes(field.showWhen.equals);
  return typeof v === 'string' && v === field.showWhen.equals;
}

export function chosenOptions(field: Field, value: Values[string]): FieldOption[] {
  if (!field.options || value == null) return [];
  const vals = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return field.options.filter((o) => vals.includes(o.value));
}

// Initial state: Globo preselects the default value when it is one of the options.
export function initialValues(set: OptionSet | null): Values {
  const values: Values = {};
  if (!set) return values;
  for (const f of set.fields) {
    if (f.default && f.options?.some((o) => o.value === f.default)) {
      values[f.id] = f.multiple ? [f.default] : f.default;
    }
  }
  return values;
}

export function addonCents(set: OptionSet | null, values: Values): number {
  if (!set) return 0;
  let total = 0;
  for (const f of set.fields) {
    if (!isVisible(f, values, set.fields)) continue;
    for (const o of chosenOptions(f, values[f.id])) total += cents(o.price);
  }
  return total;
}

export function fieldAddonCents(field: Field, values: Values): number {
  return chosenOptions(field, values[field.id]).reduce((s, o) => s + cents(o.price), 0);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} (AM|PM)$/;

// Error messages match Globo's wording where Globo has one.
export function validate(set: OptionSet | null, values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!set) return errors;
  for (const f of set.fields) {
    if (!isVisible(f, values, set.fields)) continue;
    const v = values[f.id];
    const present = hasValue(v);
    if (f.required && !present) {
      errors[f.id] = 'This field is required';
      continue;
    }
    if (!present) {
      // A colour picker revealed by "Choose my own colors" needs at least its minimum.
      if (f.type === 'swatches' && f.multiple && (f.min ?? 0) > 0 && f.showWhen) {
        errors[f.id] = `Please select at least ${f.min} option${f.min === 1 ? '' : 's'}`;
      }
      continue;
    }
    if (f.options && f.type !== 'file') {
      const vals = Array.isArray(v) ? v : [v];
      if (!vals.every((x) => typeof x === 'string' && f.options!.some((o) => o.value === x))) {
        errors[f.id] = 'Please choose one of the listed options';
        continue;
      }
      if (f.multiple && Array.isArray(v)) {
        if (f.min && v.length < f.min) errors[f.id] = `Please select at least ${f.min} option${f.min === 1 ? '' : 's'}`;
        else if (f.max && v.length > f.max) errors[f.id] = `Please select up to ${f.max} options`;
      } else if (Array.isArray(v) && v.length > 1) {
        errors[f.id] = 'Please choose one option';
      }
      continue;
    }
    if (f.type === 'text' || f.type === 'textarea') {
      if (typeof v !== 'string') errors[f.id] = 'Invalid value';
      else if (f.maxLength && v.length > f.maxLength) errors[f.id] = `Maximum ${f.maxLength} characters`;
    } else if (f.type === 'date') {
      if (typeof v !== 'string' || !(f.withTime ? DATETIME_RE : DATE_RE).test(v)) errors[f.id] = 'Please enter a valid date';
    } else if (f.type === 'file') {
      if (!isUpload(v)) errors[f.id] = 'Please upload the file again';
      else {
        const ext = v.path.split('.').pop()?.toLowerCase() ?? '';
        if (!(f.accept ?? ['jpeg', 'jpg', 'png']).includes(ext)) errors[f.id] = 'File type not allowed';
      }
    }
  }
  return errors;
}

export function toSelections(set: OptionSet | null, values: Values): Selection[] {
  if (!set) return [];
  const out: Selection[] = [];
  for (const f of set.fields) {
    if (!isVisible(f, values, set.fields)) continue;
    const v = values[f.id];
    if (!hasValue(v)) continue;
    const price = fromCents(fieldAddonCents(f, values));
    if (isUpload(v)) {
      out.push({ id: f.id, key: f.cartKey, label: f.label, value: v.name, raw: v.path, price, upload: v });
    } else if (Array.isArray(v)) {
      out.push({ id: f.id, key: f.cartKey, label: f.label, value: v.join(', '), raw: v, price });
    } else {
      out.push({ id: f.id, key: f.cartKey, label: f.label, value: String(v), raw: String(v), price });
    }
  }
  return out;
}

// Rebuild form values from stored selections (the server does this to re-check a cart line).
export function valuesFromSelections(selections: Selection[]): Values {
  const values: Values = {};
  for (const s of selections) {
    values[s.id] = s.upload ? { path: s.upload.path, name: s.upload.name } : s.raw;
  }
  return values;
}

// Same variant + same answers = same cart line (quantities add up).
export function lineKey(variantId: number, selections: Selection[]): string {
  const sig = JSON.stringify([variantId, selections.map((s) => [s.id, s.raw])]);
  let h = 5381;
  for (let i = 0; i < sig.length; i++) h = ((h << 5) + h + sig.charCodeAt(i)) | 0;
  return `${variantId}-${(h >>> 0).toString(36)}`;
}
