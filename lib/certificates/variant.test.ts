import { describe, expect, it } from 'vitest';
import { applyVariant, blankFormOptionsFor, parseBlankAnimalCount, parseVariant } from './variant';
import type { CertificateTemplate } from './types';

const health: CertificateTemplate = {
  id: 't1',
  key: 'health',
  name: 'Health certificate',
  titleEn: 'Health and Valuation Certificate',
  titleTe: 'te',
  numberPrefix: 'HC',
  published: true,
  fields: [
    { id: 'owner', label: 'Owner' },
    { id: 'sex', label: 'Sex', type: 'select', options: ['Female', 'Male'] },
    { id: 'history', label: 'History', type: 'textarea' },
  ],
  animalFields: [
    { id: 'breed', label: 'Breed' },
    { id: 'price', label: 'Price' },
  ],
  body: [
    { type: 'paragraph', text: 'Presented for the purpose of health and valuation certification.' },
    { type: 'animal-table', rows: [{ label: 'Breed', field: 'breed' }, { label: 'Price', field: 'price' }] },
  ],
};

describe('applyVariant', () => {
  it('keeps the template as-is for the combined certificate', () => {
    const v = applyVariant(health, 'full');
    expect(v.titleEn).toBe('Health and Valuation Certificate');
    expect(v.name).toBe('Health and valuation certificate');
    expect(v.animalFields?.map((f) => f.id)).toEqual(['breed', 'price']);
  });

  it('drops the price row and valuation wording for the health-only certificate', () => {
    const v = applyVariant(health, 'health-only');
    expect(v.titleEn).toBe('Health Certificate');
    expect(v.animalFields?.map((f) => f.id)).toEqual(['breed']);
    expect(v.body[0]).toEqual({ type: 'paragraph', text: 'Presented for the purpose of health certification.' });
    expect(v.body[1]).toEqual({ type: 'animal-table', rows: [{ label: 'Breed', field: 'breed' }] });
  });

  it('ignores the variant for other certificate types', () => {
    const valuation = { ...health, key: 'valuation', name: 'Valuation certificate', titleEn: 'Valuation Certificate' };
    expect(applyVariant(valuation, 'health-only').titleEn).toBe('Valuation Certificate');
  });
});

describe('parseVariant', () => {
  it('defaults anything unknown to the combined certificate', () => {
    expect(parseVariant('health-only')).toBe('health-only');
    expect(parseVariant(undefined)).toBe('full');
    expect(parseVariant(['health-only'])).toBe('full');
  });
});

describe('blankFormOptionsFor', () => {
  it('collects select choices and long-answer fields', () => {
    const o = blankFormOptionsFor(health);
    expect(o.options).toEqual({ sex: ['Female', 'Male'] });
    expect([...(o.multiline ?? [])]).toEqual(['history']);
  });
});

describe('parseBlankAnimalCount', () => {
  it('accepts 1 to 5', () => {
    expect(parseBlankAnimalCount('1')).toBe(1);
    expect(parseBlankAnimalCount('5')).toBe(5);
  });

  it('rejects anything else, so the vet is asked instead', () => {
    for (const bad of [undefined, '', '0', '6', '20', '2.5', '-1', 'abc', ['3']]) {
      expect(parseBlankAnimalCount(bad)).toBeNull();
    }
  });
});
