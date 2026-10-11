// The Health template has two printed versions: the combined "Health and
// Valuation Certificate" (the template as stored) and a pure "Health
// Certificate" without the market-price row. Shared by the builder and the
// blank-form download so both always print the same title, rows and wording.

import type { BlankFormOptions } from './render';
import type { CertificateBodyBlock, CertificateField, CertificateTemplate } from './types';

export type HealthVariant = 'full' | 'health-only';

/** The one field that distinguishes a pure Health Certificate from the combined Health and Valuation one. */
export const VALUATION_ONLY_FIELD = 'price';

export function parseVariant(value: unknown): HealthVariant {
  return value === 'health-only' ? 'health-only' : 'full';
}

export interface EffectiveTemplate {
  titleEn: string;
  titleTe: string;
  /** Display name for buttons, file names and page titles. */
  name: string;
  body: CertificateBodyBlock[];
  animalFields: CertificateField[] | undefined;
}

export function applyVariant(template: CertificateTemplate, variant: HealthVariant): EffectiveTemplate {
  const isHealthOnly = template.key === 'health' && variant === 'health-only';
  if (!isHealthOnly) {
    return {
      titleEn: template.titleEn,
      titleTe: template.titleTe,
      name: template.key === 'health' ? 'Health and valuation certificate' : template.name,
      body: template.body,
      animalFields: template.animalFields,
    };
  }
  return {
    titleEn: 'Health Certificate',
    titleTe: 'ఆరోగ్య ధృవీకరణ పత్రం',
    name: 'Health certificate',
    animalFields: template.animalFields?.filter((f) => f.id !== VALUATION_ONLY_FIELD),
    body: template.body.map((block) => {
      if (block.type === 'animal-table') {
        return { ...block, rows: block.rows.filter((r) => r.field !== VALUATION_ONLY_FIELD) };
      }
      if (block.type === 'paragraph') {
        return { ...block, text: block.text.replace(/health and valuation certification/gi, 'health certification') };
      }
      return block;
    }),
  };
}

/** What the blank-form renderer needs to know about a template's fields: their printed choices, and which need writing space. */
export function blankFormOptionsFor(template: CertificateTemplate): BlankFormOptions {
  const options: Record<string, string[]> = {};
  const multiline = new Set<string>();
  for (const field of template.fields) {
    if (field.type === 'select' && field.options?.length) options[field.id] = field.options;
    if (field.type === 'textarea') multiline.add(field.id);
  }
  return { options, multiline };
}

/** Most animals a blank multi-animal certificate can have on one sheet; more columns stop fitting the A4 width. */
export const MAX_BLANK_ANIMALS = 5;

/** The vet's chosen number of animal columns for a blank certificate, or null if missing/invalid (then we ask). */
export function parseBlankAnimalCount(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= MAX_BLANK_ANIMALS ? n : null;
}
