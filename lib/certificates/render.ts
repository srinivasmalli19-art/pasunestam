// Renders a certificate_templates.body (see types.ts) against a certificate's
// data, ported from the bespoke per-type render() functions in the
// pasunestam.html prototype into one data-driven engine, so a new
// certificate type (hand-built or AI-imported in Phase 4) needs no code.

import type { CertificateBodyBlock, CertificateData } from './types';

/** Escapes text for safe insertion into HTML (the builder preview and PDF render raw HTML). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** A dotted underline placeholder for a blank field, matching the prototype's `.blank` style. */
export function valueOrBlank(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value).trim();
  return s !== '' ? escapeHtml(s) : '<span class="blank"></span>';
}

// A certificate's date/datetime-local fields are timezone-naive "wall clock"
// values the vet typed (e.g. "2026-09-11" or "2026-09-11T05:30"). We parse
// the components directly and format in UTC so the displayed date never
// shifts by a day depending on the server's or browser's local timezone.
function parseDateParts(value: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), h: m[4] ? Number(m[4]) : 0, mi: m[5] ? Number(m[5]) : 0 };
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return '';
  const p = parseDateParts(value);
  if (!p) return value;
  const d = new Date(Date.UTC(p.y, p.mo - 1, p.d));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return '';
  const p = parseDateParts(value);
  if (!p) return value;
  const d = new Date(Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi));
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function formatCurrency(value: string | undefined | null): string {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return '<span class="blank"></span>';
  return '₹' + n.toLocaleString('en-IN');
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Indian-numbering (crore/lakh/thousand) number-to-words, e.g. for "Rupees X only" wording. */
export function numberToWords(value: string | number | undefined | null): string {
  let num = Math.floor(Number(value) || 0);
  if (!num) return '';
  const two = (x: number): string => (x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? ' ' + ONES[x % 10] : ''));
  const three = (x: number): string => (x >= 100 ? ONES[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x));
  let s = '';
  const cr = Math.floor(num / 1e7); num %= 1e7;
  const lk = Math.floor(num / 1e5); num %= 1e5;
  const th = Math.floor(num / 1000); num %= 1000;
  if (cr) s += three(cr) + ' Crore ';
  if (lk) s += two(lk) + ' Lakh ';
  if (th) s += two(th) + ' Thousand ';
  if (num) s += three(num);
  return s.trim();
}

type Filter = 'date' | 'datetime' | 'lower' | 'currency' | 'words';

function applyFilter(raw: string, filter: Filter | undefined): string {
  switch (filter) {
    case 'date':
      return formatDate(raw);
    case 'datetime':
      return formatDateTime(raw);
    case 'lower':
      return raw.toLowerCase();
    case 'currency':
      return formatCurrency(raw);
    case 'words':
      return numberToWords(raw);
    default:
      return raw;
  }
}

// {{field}}, {{field|filter}}, {{field|default:Text}}
const PLACEHOLDER = /\{\{(\w+)(?:\|(\w+)(?::([^}]*))?)?\}\}/g;
// A single, non-nested conditional block: {{#if field}}...{{/if}}
const CONDITIONAL = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

/** Renders one paragraph/heading's placeholder text against the certificate's data. */
export function renderText(text: string, data: CertificateData, options: { blankAsPlaceholder?: boolean } = {}): string {
  const blankAsPlaceholder = options.blankAsPlaceholder ?? true;

  const withConditionals = text.replace(CONDITIONAL, (_match, field: string, inner: string) => {
    return (data[field] ?? '').trim() !== '' ? inner : '';
  });

  return withConditionals.replace(PLACEHOLDER, (_match, field: string, filter: string | undefined, defaultText: string | undefined) => {
    const raw = (data[field] ?? '').trim();
    if (raw === '') {
      if (defaultText !== undefined) return escapeHtml(defaultText);
      return blankAsPlaceholder ? '<span class="blank"></span>' : '';
    }
    return filter === 'currency' ? applyFilter(raw, filter as Filter) : escapeHtml(applyFilter(raw, filter as Filter | undefined));
  });
}

function renderTableRow(label: string, fieldSpec: string, data: CertificateData, filter?: Filter): string {
  const value = fieldSpec
    .split(',')
    .map((id) => (data[id.trim()] ?? '').trim())
    .filter(Boolean)
    .map((v) => (filter ? applyFilter(v, filter) : v))
    .join(', ');
  return `<tr><td>${escapeHtml(label)}</td><td>${filter === 'currency' ? value || '<span class="blank"></span>' : valueOrBlank(value)}</td></tr>`;
}

/** Renders every block of a template's body into the certificate's HTML markup. */
export function renderBody(body: CertificateBodyBlock[], data: CertificateData): string {
  return body
    .map((block) => {
      if (block.type === 'heading') return `<h5>${escapeHtml(block.text)}</h5>`;
      if (block.type === 'paragraph') return `<p>${renderText(block.text, data)}</p>`;
      if (block.type === 'table') {
        return `<table class="c-table">${block.rows.map((r) => renderTableRow(r.label, r.field, data, r.filter)).join('')}</table>`;
      }
      return '';
    })
    .join('\n');
}
