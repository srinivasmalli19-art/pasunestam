import { describe, expect, it } from 'vitest';
import {
  aggregatePrevious,
  combineSections,
  financialYearStartMonth,
  formatNumber,
  progressiveTotal,
  round2,
  sanitizeValue,
  sanitizeWork,
  sumValues,
  toNumber,
} from './calculations';

describe('toNumber', () => {
  it('parses numeric strings', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber('3.5')).toBe(3.5);
  });

  it('treats blank or invalid input as 0', () => {
    expect(toNumber('')).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('round2', () => {
  it('avoids floating point noise', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe('formatNumber', () => {
  it('shows blank for zero, not "0"', () => {
    expect(formatNumber(0)).toBe('');
  });

  it('shows the rounded number otherwise', () => {
    expect(formatNumber(12.001)).toBe('12');
    expect(formatNumber(3.456)).toBe('3.46');
  });
});

describe('sanitizeValue', () => {
  it('strips non-digits when decimals are not allowed', () => {
    expect(sanitizeValue('12a3.4b')).toBe('1234');
  });

  it('keeps a single decimal point when decimals are allowed', () => {
    expect(sanitizeValue('1.2.3', true)).toBe('1.23');
  });

  it('caps length to 10 characters', () => {
    expect(sanitizeValue('12345678901234')).toBe('1234567890');
  });
});

describe('sanitizeWork', () => {
  it('cleans every field, using the decimal set per key', () => {
    const cleaned = sanitizeWork(
      { during: { 'fodder.maize': '2.5x', 'new.white': '4a2' } },
      new Set(['fodder.maize'])
    );
    expect(cleaned.during).toEqual({ 'fodder.maize': '2.5', 'new.white': '42' });
  });

  it('passes through undefined maps unchanged', () => {
    expect(sanitizeWork({ during: { a: '1' } }).opening).toBeUndefined();
  });
});

describe('financialYearStartMonth', () => {
  it('resolves to April of the same year on or after April', () => {
    expect(financialYearStartMonth('2026-09')).toBe('2026-04');
    expect(financialYearStartMonth('2026-04')).toBe('2026-04');
  });

  it('resolves to April of the previous year before April', () => {
    expect(financialYearStartMonth('2026-01')).toBe('2025-04');
    expect(financialYearStartMonth('2026-03')).toBe('2025-04');
  });
});

describe('aggregatePrevious', () => {
  it('sums opening and during figures across earlier months', () => {
    const total = aggregatePrevious([
      { opening: { 'new.white': '10' }, during: { 'new.white': '5' } },
      { during: { 'new.white': '3' } },
    ]);
    expect(total['new.white']).toBe(18);
  });

  it('ignores missing months', () => {
    expect(aggregatePrevious([undefined, { during: { a: '2' } }])).toEqual({ a: 2 });
  });
});

describe('progressiveTotal', () => {
  it('adds previous total to this month', () => {
    expect(progressiveTotal(10, 5)).toBe(15);
  });
});

describe('sumValues', () => {
  it('adds up a list of numbers, rounded', () => {
    expect(sumValues([1.111, 2.222, 3.333])).toBe(6.67);
  });
});

describe('combineSections (Section C = A + B)', () => {
  it('adds matching keys from two sections', () => {
    const newCases = { white: 10, black: 5 };
    const oldCases = { white: 3, sheep: 2 };
    expect(combineSections(newCases, oldCases)).toEqual({ white: 13, black: 5, sheep: 2 });
  });
});
