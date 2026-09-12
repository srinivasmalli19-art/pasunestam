// Shapes shared between the certificate builder, the template-import (Phase 4)
// flow, and the `certificateTemplates` Firestore collection's `fields` /
// `body` array fields.

export type CertificateFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'date'
  | 'datetime-local'
  | 'number';

export interface CertificateField {
  id: string;
  label: string;
  type?: CertificateFieldType;
  options?: string[];
  placeholder?: string;
  /** Span both form columns. */
  full?: boolean;
  required?: boolean;
}

/**
 * The certificate body, as an ordered list of blocks. A `paragraph`'s `text`
 * supports the small placeholder language implemented in render.ts:
 * {{field}}, {{field|date}}, {{field|datetime}}, {{field|lower}},
 * {{field|currency}}, {{field|words}}, {{field|default:Text}}, and a single
 * (non-nested) {{#if field}}...{{/if}}.
 */
export type CertificateBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | {
      type: 'table';
      rows: Array<{
        label: string;
        /** A field id, or several comma-separated ids joined with ", " (e.g. "species,breed"). */
        field: string;
        /** Applied to each field before joining; only really meaningful for a single-field row. */
        filter?: 'date' | 'datetime' | 'currency' | 'words';
      }>;
    };

export interface CertificateTemplate {
  id: string;
  key: string;
  name: string;
  titleEn: string;
  titleTe: string;
  numberPrefix: string;
  fields: CertificateField[];
  body: CertificateBodyBlock[];
  published: boolean;
}

export interface Certificate {
  id: string;
  templateId: string;
  data: CertificateData;
  number: string | null;
  status: CertificateStatus;
  cancelledReason: string | null;
  cancelledAt: string | null;
  createdBy: string;
  issuedBy: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The "Issuing veterinarian" fields, common to every certificate type. */
export interface VetProfile {
  vetName?: string | null;
  designation?: string | null;
  registrationNo?: string | null;
  institution?: string | null;
  mandal?: string | null;
  district?: string | null;
}

export type CertificateData = Record<string, string>;
export type CertificateStatus = 'draft' | 'issued' | 'cancelled';
