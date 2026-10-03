/** @jsxImportSource preact */
// Product form island: live price, variant picker, quantity, the option widget
// (a rebuild of the store's Globo Product Options sets), and Add to cart.
// Server-rendered at build with the defaults, so there is no layout shift on hydrate.

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Field, FieldOption, OptionSet, UploadValue, Values } from '../../lib/shop/types';
import {
  addonCents,
  chosenOptions,
  fieldAddonCents,
  fromCents,
  cents,
  initialValues,
  isVisible,
  lineKey,
  money,
  toSelections,
  validate,
} from '../../lib/shop/price';
import { addItem, MAX_QTY } from '../../lib/shop/cart';
import { icons } from './icons';

export type FormVariant = {
  id: number;
  title: string;
  options: string[];
  price: number;
  compareAt: number | null;
  available: boolean;
  imageId: number | null;
};

export type FormProduct = {
  id: number;
  handle: string;
  title: string;
  options: { name: string; values: string[] }[];
  variants: FormVariant[];
  thumbs: Record<string, string>; // image id -> small image URL (cart thumbnail)
  firstImageId: number | null;
};

type Props = {
  product: FormProduct;
  optionSet: OptionSet | null;
};

const MAX_UPLOAD = 10 * 1024 * 1024;

// Decision 6 (plan section 9): Shopify shows the axis name "Title" on the marquee letters.
function axisLabel(name: string): string {
  return name === 'Title' ? 'Letter' : name;
}

function addonText(price: number): string {
  return price > 0 ? `(+ ${money(price)})` : '';
}

function formatDateTime(v: string): string {
  // datetime-local "2026-10-12T14:30" -> "2026-10-12 2:30 PM" (Globo's 12-hour format)
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return '';
  let h = Number(m[2]);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${m[1]} ${h}:${m[3]} ${ap}`;
}

function toDateTimeLocal(v: string): string {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/.exec(v);
  if (!m) return '';
  let h = Number(m[2]) % 12;
  if (m[4] === 'PM') h += 12;
  return `${m[1]}T${String(h).padStart(2, '0')}:${m[3]}`;
}

function Svg({ html, className }: { html: string; className?: string }) {
  return <span class={className} style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function ProductForm({ product, optionSet }: Props) {
  const fields = optionSet?.fields ?? [];
  const realAxes = product.options.filter((o) => !(o.values.length === 1 && o.values[0] === 'Default Title'));
  const [variantId, setVariantId] = useState<number>(
    (product.variants.find((v) => v.available) ?? product.variants[0]).id,
  );
  const [qty, setQty] = useState(1);
  const [values, setValues] = useState<Values>(() => initialValues(optionSet));
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const addCents = useMemo(() => addonCents(optionSet, values), [optionSet, values]);
  const unitCents = cents(variant.price) + addCents;
  const errors = useMemo(() => (attempted ? validate(optionSet, values) : {}), [attempted, optionSet, values]);

  // ?variant=<id> deep links, like Shopify.
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('variant'));
    if (id && product.variants.some((v) => v.id === id)) setVariantId(id);
  }, []);

  function chooseVariant(axisIndex: number, value: string) {
    const current = variant.options.slice();
    current[axisIndex] = value;
    const next =
      product.variants.find((v) => v.options.every((o, i) => o === current[i])) ??
      product.variants.find((v) => v.options[axisIndex] === value);
    if (!next) return;
    setVariantId(next.id);
    const url = new URL(location.href);
    url.searchParams.set('variant', String(next.id));
    history.replaceState(null, '', url.toString());
    if (next.imageId) window.dispatchEvent(new CustomEvent('variant:image', { detail: { imageId: next.imageId } }));
  }

  function set(id: string, v: Values[string]) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function toggleSwatch(field: Field, value: string) {
    const cur = values[field.id];
    if (!field.multiple) {
      set(field.id, cur === value && !field.required ? undefined : value);
      return;
    }
    const arr = Array.isArray(cur) ? cur.slice() : [];
    const i = arr.indexOf(value);
    if (i >= 0) {
      arr.splice(i, 1);
      setNotice((n) => ({ ...n, [field.id]: '' }));
    } else {
      if (field.max && arr.length >= field.max) {
        setNotice((n) => ({ ...n, [field.id]: `You can select up to ${field.max} options` }));
        return;
      }
      arr.push(value);
    }
    set(field.id, arr);
  }

  async function upload(field: Field, file: File | null | undefined) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const accept = field.accept ?? ['jpeg', 'jpg', 'png'];
    if (!accept.includes(ext)) {
      setNotice((n) => ({ ...n, [field.id]: `Allowed file types: ${accept.join(', ')}` }));
      return;
    }
    if (file.size > MAX_UPLOAD) {
      setNotice((n) => ({ ...n, [field.id]: 'The file is larger than 10 MB' }));
      return;
    }
    setNotice((n) => ({ ...n, [field.id]: '' }));
    setUploading((u) => ({ ...u, [field.id]: true }));
    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const data = await res.json();
      if (!res.ok || !data.uploadUrl) throw new Error(data.error || 'Upload failed');
      const put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
        body: file,
      });
      if (!put.ok) throw new Error('Upload failed');
      const value: UploadValue = { path: data.path, name: file.name };
      set(field.id, value);
      setPreview((p) => ({ ...p, [field.id]: URL.createObjectURL(file) }));
    } catch {
      setNotice((n) => ({ ...n, [field.id]: 'Upload failed, please try again' }));
    } finally {
      setUploading((u) => ({ ...u, [field.id]: false }));
    }
  }
  function scrollToFirstError(errs: Record<string, string>) {
    const first = fields.find((f) => errs[f.id]);
    if (!first) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-field="${first.id}"]`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function onAdd(e: Event) {
    e.preventDefault();
    if (busy) return;
    setAttempted(true);
    setFormError('');
    if (Object.values(uploading).some(Boolean)) {
      setFormError('Please wait for your file to finish uploading.');
      return;
    }
    const errs = validate(optionSet, values);
    if (Object.keys(errs).length) {
      scrollToFirstError(errs);
      return;
    }
    if (!variant.available) return;
    setBusy(true);
    const selections = toSelections(optionSet, values);
    const imageId = variant.imageId ?? product.firstImageId;
    addItem({
      key: lineKey(variant.id, selections),
      productId: product.id,
      variantId: variant.id,
      handle: product.handle,
      title: product.title,
      variantTitle: realAxes.length ? variant.title : null,
      options: realAxes.map((axis) => ({
        name: axisLabel(axis.name),
        value: variant.options[product.options.indexOf(axis)] ?? '',
      })),
      image: imageId != null ? product.thumbs[String(imageId)] ?? null : null,
      quantity: qty,
      basePrice: variant.price,
      addons: fromCents(addCents),
      unitPrice: fromCents(unitCents),
      selections,
      setKey: optionSet?.key ?? null,
    });
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.('event', 'add_to_cart', {
      currency: 'CAD',
      value: fromCents(unitCents) * qty,
      items: [{ item_id: String(product.id), item_name: product.title, item_variant: variant.title, price: fromCents(unitCents), quantity: qty }],
    });
    location.href = '/cart';
  }

  function renderField(f: Field) {
    const shown = isVisible(f, values, fields);
    const v = values[f.id];
    const err = errors[f.id] || notice[f.id];
    const chosen = chosenOptions(f, v);
    const fieldAdd = fieldAddonCents(f, values);
    const isChoice = f.type === 'radio' || f.type === 'buttons' || f.type === 'swatches' || f.type === 'select';
    const selectedText = isChoice && chosen.length ? chosen.map((o) => o.value).join(', ') : '';
    const labelId = `gpo-${f.id}-label`;
    const inputId = `gpo-${f.id}`;

    return (
      <div class="gpo__group" data-field={f.id} hidden={!shown} key={f.id}>
        <label class={`gpo__label${f.required ? ' is-required' : ''}`} id={labelId} for={isChoice ? undefined : inputId}>
          <span class="gpo__label-text">{f.label}</span>
          {fieldAdd > 0 && f.type !== 'swatches' && <span class="gpo__addon">{addonText(fromCents(fieldAdd))}</span>}
        </label>
        {selectedText && <div class="gpo__selected">{selectedText}</div>}

        {f.type === 'radio' && (
          <div class={`gpo__opts gpo__opts--${f.layout === 'horizontal' ? 'horizontal' : 'vertical'}`} role="radiogroup" aria-labelledby={labelId}>
            {(f.options ?? []).map((o, i) => (
              <div class="gpo__choice" key={o.value}>
                <input
                  type="radio"
                  id={`${inputId}-${i}`}
                  name={`${product.id}-${f.id}`}
                  value={o.value}
                  checked={v === o.value}
                  disabled={!shown}
                  onChange={() => set(f.id, o.value)}
                />
                <label for={`${inputId}-${i}`}>
                  <span>
                    {o.value}
                    {o.price > 0 && <span class="gpo__addon" style={{ marginLeft: '4px' }}>{addonText(o.price)}</span>}
                  </span>
                </label>
                {o.help && <span class="gpo__help">{o.help}</span>}
              </div>
            ))}
          </div>
        )}

        {f.type === 'buttons' && (
          <div class="gpo__opts gpo__opts--horizontal" role="radiogroup" aria-labelledby={labelId}>
            {(f.options ?? []).map((o, i) => (
              <div class="gpo__btn" key={o.value}>
                <input
                  type="radio"
                  id={`${inputId}-${i}`}
                  name={`${product.id}-${f.id}`}
                  value={o.value}
                  checked={v === o.value}
                  disabled={!shown}
                  onChange={() => set(f.id, o.value)}
                />
                <label for={`${inputId}-${i}`}>
                  {o.value}
                  {o.price > 0 && !o.value.includes(String(o.price)) && !o.value.includes(o.price.toFixed(2)) && ` ${addonText(o.price)}`}
                </label>
              </div>
            ))}
          </div>
        )}

        {f.type === 'swatches' && (
          <div class="gpo__opts gpo__opts--horizontal" role="group" aria-labelledby={labelId}>
            {(f.options ?? []).map((o, i) => {
              const checked = Array.isArray(v) ? v.includes(o.value) : v === o.value;
              const tip = `${o.value}${o.price > 0 ? ` ${addonText(o.price)}` : ''}`;
              return (
                <div class="gpo__swatch" key={o.value}>
                  <input
                    type={f.multiple ? 'checkbox' : 'radio'}
                    id={`${inputId}-${i}`}
                    name={`${product.id}-${f.id}`}
                    value={o.value}
                    checked={checked}
                    disabled={!shown}
                    aria-label={tip}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSwatch(f, o.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleSwatch(f, o.value);
                      }
                    }}
                  />
                  <label for={`${inputId}-${i}`}>
                    {o.image && <img src={o.image} alt="" width={60} height={60} loading="lazy" decoding="async" />}
                    <span class="gpo__tooltip">{tip}</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        {f.type === 'select' && (
          <div class="gpo__select">
            <select
              id={inputId}
              disabled={!shown}
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => set(f.id, (e.target as HTMLSelectElement).value || undefined)}
            >
              <option value="">{f.placeholder || '-- Please select --'}</option>
              {(f.options ?? []).map((o) => (
                <option value={o.value} key={o.value}>
                  {o.value}
                  {o.price > 0 ? ` ${addonText(o.price)}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {f.type === 'text' && (
          <div class="gpo__input-wrap">
            <input
              type="text"
              class="gpo__input"
              id={inputId}
              disabled={!shown}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              value={typeof v === 'string' ? v : ''}
              onInput={(e) => set(f.id, (e.target as HTMLInputElement).value)}
            />
          </div>
        )}

        {f.type === 'textarea' && (
          <div class="gpo__input-wrap">
            <textarea
              class="gpo__input"
              id={inputId}
              rows={4}
              disabled={!shown}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              value={typeof v === 'string' ? v : ''}
              onInput={(e) => set(f.id, (e.target as HTMLTextAreaElement).value)}
            />
          </div>
        )}

        {f.type === 'date' && (
          <div class="gpo__input-wrap">
            {f.withTime ? (
              <input
                type="datetime-local"
                class={`gpo__input${typeof v === 'string' && v ? '' : ' is-empty'}`}
                id={inputId}
                disabled={!shown}
                value={typeof v === 'string' ? toDateTimeLocal(v) : ''}
                onInput={(e) => set(f.id, formatDateTime((e.target as HTMLInputElement).value) || undefined)}
              />
            ) : (
              <input
                type="date"
                class={`gpo__input${typeof v === 'string' && v ? '' : ' is-empty'}`}
                id={inputId}
                disabled={!shown}
                value={typeof v === 'string' ? v : ''}
                onInput={(e) => set(f.id, (e.target as HTMLInputElement).value || undefined)}
              />
            )}
          </div>
        )}

        {f.type === 'file' &&
          (v && typeof v === 'object' && !Array.isArray(v) ? (
            <div class="gpo__file">
              {preview[f.id] && <img src={preview[f.id]} alt="" />}
              <span>{(v as UploadValue).name}</span>
              <button
                type="button"
                onClick={() => {
                  set(f.id, undefined);
                  setPreview((p) => ({ ...p, [f.id]: '' }));
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <FileDrop
              id={inputId}
              accept={(f.accept ?? ['jpeg', 'jpg', 'png']).map((x) => `.${x}`).join(',')}
              disabled={!shown}
              busy={!!uploading[f.id]}
              onFile={(file) => upload(f, file)}
            />
          ))}

        {err && <p class="gpo__error">{err}</p>}
      </div>
    );
  }

  const comparePrice = variant.compareAt;
  const showAxes = realAxes.length > 0;

  return (
    <div ref={rootRef}>
      <div class="s-product__price" id="price">
        <span class="s-visually-hidden">{comparePrice ? 'Sale price' : 'Regular price'}</span>
        {comparePrice && <s>{money(comparePrice + fromCents(addCents))} CAD</s>}
        <span data-price>{money(fromCents(unitCents))}</span> CAD
      </div>
      <p class="s-product__tax">
        <a href="/policies/shipping-policy">Shipping</a> calculated at checkout.
      </p>

      <form onSubmit={onAdd} noValidate>
        {showAxes &&
          realAxes.map((axis, ai) => (
            <div class="s-variant" key={axis.name}>
              <label class="s-form__label" for={`variant-${ai}`}>
                {axisLabel(axis.name)}
              </label>
              <div class="s-select">
                <select id={`variant-${ai}`} value={variant.options[ai]} onChange={(e) => chooseVariant(ai, (e.target as HTMLSelectElement).value)}>
                  {axis.values.map((val) => (
                    <option value={val} key={val}>
                      {val}
                    </option>
                  ))}
                </select>
                <Svg html={icons.caret} />
              </div>
            </div>
          ))}

        <div class="s-qty-wrap">
          <label class="s-form__label" for={`qty-${product.id}`}>
            Quantity
          </label>
          <div class="s-qty">
            <button type="button" aria-label={`Decrease quantity for ${product.title}`} disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Svg html={icons.minus} />
            </button>
            <input
              type="number"
              id={`qty-${product.id}`}
              min={1}
              max={MAX_QTY}
              value={qty}
              onChange={(e) => {
                const n = Math.floor(Number((e.target as HTMLInputElement).value));
                setQty(Number.isFinite(n) && n >= 1 ? Math.min(MAX_QTY, n) : 1);
              }}
            />
            <button type="button" aria-label={`Increase quantity for ${product.title}`} disabled={qty >= MAX_QTY} onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}>
              <Svg html={icons.plus} />
            </button>
          </div>
        </div>

        {fields.length > 0 && (
          <div class="gpo">
            {fields.map(renderField)}
            {addCents > 0 && (
              <div class="gpo__total">
                Selections will add <span class="gpo__money">{money(fromCents(addCents))}</span> to the price
              </div>
            )}
          </div>
        )}

        <div class="s-atc">
          <button type="submit" class="s-button" disabled={!variant.available || busy} aria-busy={busy}>
            {variant.available ? 'Add to cart' : 'Sold out'}
          </button>
          {formError && <p class="s-atc__error" role="alert">{formError}</p>}
          {attempted && Object.keys(errors).length > 0 && (
            <p class="s-visually-hidden" role="alert">
              Please complete the required options.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function FileDrop({
  id,
  accept,
  disabled,
  busy,
  onFile,
}: {
  id: string;
  accept: string;
  disabled: boolean;
  busy: boolean;
  onFile: (f: File | undefined) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      class={`gpo__dropzone${over ? ' is-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer?.files?.[0]);
      }}
    >
      <div class="gpo__dropzone-action">{busy ? 'Uploading…' : 'Choose file'}</div>
      <p class="gpo__dropzone-caption">or drop file to upload</p>
      <input
        type="file"
        id={id}
        accept={accept}
        disabled={disabled || busy}
        onChange={(e) => {
          const input = e.target as HTMLInputElement;
          onFile(input.files?.[0]);
          input.value = '';
        }}
      />
    </div>
  );
}

export type { FieldOption };
