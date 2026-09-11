import { describe, expect, it } from 'vitest';
import { formatDate, numberToWords, renderBody, renderText, valueOrBlank } from './render';

describe('valueOrBlank', () => {
  it('returns the escaped value when present', () => {
    expect(valueOrBlank('P. Venkata Rao')).toBe('P. Venkata Rao');
  });

  it('returns a blank placeholder for empty or missing values', () => {
    expect(valueOrBlank('')).toBe('<span class="blank"></span>');
    expect(valueOrBlank(undefined)).toBe('<span class="blank"></span>');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as day/short-month/year', () => {
    expect(formatDate('2026-09-11')).toBe('11 Sept 2026');
  });

  it('passes through blank input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });
});

describe('numberToWords', () => {
  it('spells out lakhs and thousands using Indian numbering', () => {
    expect(numberToWords(85000)).toBe('Eighty Five Thousand');
    expect(numberToWords('250000')).toBe('Two Lakh Fifty Thousand');
  });

  it('returns an empty string for zero or blank', () => {
    expect(numberToWords(0)).toBe('');
    expect(numberToWords('')).toBe('');
  });
});

describe('renderText', () => {
  it('interpolates a plain field', () => {
    expect(renderText('Owner: {{owner}}', { owner: 'Rao' })).toBe('Owner: Rao');
  });

  it('shows a blank placeholder for a missing field', () => {
    expect(renderText('Owner: {{owner}}', {})).toBe('Owner: <span class="blank"></span>');
  });

  it('applies the date filter', () => {
    expect(renderText('On {{examDate|date}}.', { examDate: '2026-07-14' })).toBe('On 14 Jul 2026.');
  });

  it('applies the lower filter', () => {
    expect(renderText('fit for {{purpose|lower}}', { purpose: 'Transport' })).toBe('fit for transport');
  });

  it('applies a default when the field is blank', () => {
    expect(renderText('Samples: {{samples|default:Nil}}', {})).toBe('Samples: Nil');
    expect(renderText('Samples: {{samples|default:Nil}}', { samples: 'Blood' })).toBe('Samples: Blood');
  });

  it('renders a conditional block only when the field has a value', () => {
    const template = 'fit for transport{{#if dest}} to {{dest}}{{/if}}.';
    expect(renderText(template, { dest: 'Rampur' })).toBe('fit for transport to Rampur.');
    expect(renderText(template, {})).toBe('fit for transport.');
  });

  it('escapes HTML in field values', () => {
    expect(renderText('{{owner}}', { owner: '<script>' })).toBe('&lt;script&gt;');
  });
});

describe('renderBody', () => {
  it('renders headings, paragraphs and table rows in order', () => {
    const html = renderBody(
      [
        { type: 'heading', text: 'History' },
        { type: 'paragraph', text: '{{history}}' },
        { type: 'table', rows: [{ label: 'Species / breed', field: 'species,breed' }] },
      ],
      { history: 'Off feed for two days.', species: 'Cattle', breed: 'Ongole' }
    );
    expect(html).toContain('<h5>History</h5>');
    expect(html).toContain('<p>Off feed for two days.</p>');
    expect(html).toContain('<td>Species / breed</td><td>Cattle, Ongole</td>');
  });

  it('joins only the non-empty fields of a combined table row', () => {
    const html = renderBody([{ type: 'table', rows: [{ label: 'Sex / age', field: 'sex,age' }] }], { sex: 'Female' });
    expect(html).toContain('<td>Sex / age</td><td>Female</td>');
  });

  it('applies a filter to a table row value', () => {
    const html = renderBody(
      [{ type: 'table', rows: [{ label: 'Date and time of death', field: 'deathTime', filter: 'datetime' }] }],
      { deathTime: '2026-09-11T05:30' }
    );
    expect(html).toContain('11 Sept 2026, 05:30');
  });
});
