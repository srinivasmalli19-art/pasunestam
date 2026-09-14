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
    }
  | {
      /** One or more animals side by side as columns, each row a particular (e.g. breed, age, tag no.) — matches the real Health Certificate's layout. */
      type: 'animal-table';
      rows: Array<{ label: string; field: string }>;
    };

export interface CertificateTemplate {
  id: string;
  key: string;
  name: string;
  titleEn: string;
  titleTe: string;
  numberPrefix: string;
  fields: CertificateField[];
  /** Per-animal particulars, repeated once per animal on the certificate (see 'animal-table'). Absent/empty for single-subject certificate types. */
  animalFields?: CertificateField[];
  body: CertificateBodyBlock[];
  published: boolean;
}

export interface Certificate {
  id: string;
  templateId: string;
  data: CertificateData;
  /** One entry per animal, keyed by the template's animalFields ids. Empty/absent when the template has no animalFields. */
  animals?: CertificateData[];
  number: string | null;
  status: CertificateStatus;
  cancelledReason: string | null;
  cancelledAt: string | null;
  /** Null for a certificate issued anonymously (no account) — see issueCertificateDirect. */
  createdBy: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * A snapshot of the issuing vet's details as typed into the form at issue
   * time. Anonymous issuers have no `profiles` doc to join later, so this is
   * the only record of who issued the certificate; written for every
   * certificate issued via issueCertificateDirect. Certificates issued
   * before this field existed fall back to a `profiles`-by-`issuedBy` lookup.
   */
  vet?: {
    fullName: string;
    designation: string;
    registrationNo: string;
    institution: string;
    mandal: string;
    district: string;
  };
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
