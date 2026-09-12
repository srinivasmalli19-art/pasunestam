// One-time seed for the three certificate templates, run with:
//   npm run db:seed
// Works against either the Firebase Local Emulator Suite (set
// FIRESTORE_EMULATOR_HOST first, e.g. via `npm run emulators` in another
// terminal) or a real project (via .env.local's service account).
//
// PLACEHOLDER WORDING: the user's real health/valuation/post-mortem
// certificates were never attached to this project — this seed uses the
// wording worked out in pasunestam.html. Replace title/body text below once
// the real documents are available.

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local (e.g. running purely against the emulator with env vars
  // already exported in the shell) — that's fine, keep going.
}

import { adminDb } from '../lib/firebase/admin';
import type { CertificateBodyBlock, CertificateField } from '../lib/certificates/types';

interface SeedTemplate {
  key: string;
  name: string;
  titleEn: string;
  titleTe: string;
  numberPrefix: string;
  fields: CertificateField[];
  body: CertificateBodyBlock[];
}

const ANIMAL_FIELDS: CertificateField[] = [
  { id: 'owner', label: "Owner's name", required: true },
  { id: 'addr', label: 'Village / address' },
  {
    id: 'species',
    label: 'Species',
    type: 'select',
    options: ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Dog', 'Cat', 'Horse', 'Pig', 'Poultry'],
  },
  { id: 'breed', label: 'Breed' },
  { id: 'sex', label: 'Sex', type: 'select', options: ['Female', 'Male'] },
  { id: 'age', label: 'Age', placeholder: 'e.g. 4 years' },
  { id: 'tag', label: 'Ear tag / microchip no.', full: true },
  { id: 'colour', label: 'Colour and identification marks', full: true },
];

const TEMPLATES: SeedTemplate[] = [
  {
    key: 'health',
    name: 'Health certificate',
    titleEn: 'Health Certificate',
    titleTe: 'ఆరోగ్య ధృవీకరణ పత్రం',
    numberPrefix: 'HC',
    fields: [
      ...ANIMAL_FIELDS,
      {
        id: 'vacc',
        label: 'Vaccinations with dates',
        type: 'textarea',
        full: true,
        placeholder: 'FMD – 14 Jul 2026; HS – 02 Jun 2026',
      },
      {
        id: 'purpose',
        label: 'Fit for',
        type: 'select',
        options: ['Transport', 'Sale', 'Show / exhibition', 'Insurance', 'Travel with owner'],
      },
      { id: 'dest', label: 'Destination (if transport)' },
      { id: 'examDate', label: 'Date of examination', type: 'date' },
      { id: 'remarks', label: 'Remarks', type: 'textarea', full: true },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Certified that I have personally examined the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, on {{examDate|date}}. On clinical examination it was found free from symptoms of infectious and contagious disease, and is fit for {{purpose|lower}}{{#if dest}} to {{dest}}{{/if}}.',
      },
      {
        type: 'table',
        rows: [
          { label: 'Species', field: 'species' },
          { label: 'Breed', field: 'breed' },
          { label: 'Sex', field: 'sex' },
          { label: 'Age', field: 'age' },
          { label: 'Ear tag / microchip no.', field: 'tag' },
          { label: 'Colour and identification marks', field: 'colour' },
          { label: 'Vaccinations', field: 'vacc' },
        ],
      },
      { type: 'paragraph', text: '{{#if remarks}}<b>Remarks:</b> {{remarks}}{{/if}}' },
    ],
  },
  {
    key: 'valuation',
    name: 'Valuation certificate',
    titleEn: 'Valuation Certificate',
    titleTe: 'విలువ ధృవీకరణ పత్రం',
    numberPrefix: 'VC',
    fields: [
      ...ANIMAL_FIELDS,
      { id: 'lactation', label: 'Lactation no.' },
      { id: 'yield', label: 'Milk yield (litres/day)' },
      { id: 'preg', label: 'Pregnancy status', placeholder: 'e.g. 5 months pregnant' },
      { id: 'health', label: 'General health', type: 'select', options: ['Healthy', 'Fair', 'Poor'] },
      { id: 'value', label: 'Market value (₹)', type: 'number' },
      { id: 'purpose', label: 'Purpose', type: 'select', options: ['Insurance', 'Bank loan', 'Sale'] },
      { id: 'agency', label: 'Bank / insurance company', full: true },
      { id: 'examDate', label: 'Date of examination', type: 'date' },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Certified that I have examined the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, on {{examDate|date}}, for the purpose of {{purpose|lower}}{{#if agency}} with {{agency}}{{/if}}. Based on its age, breed, production and health, in my opinion its present market value is {{value|currency}} (Rupees {{value|words}} only).',
      },
      {
        type: 'table',
        rows: [
          { label: 'Species', field: 'species' },
          { label: 'Breed', field: 'breed' },
          { label: 'Sex', field: 'sex' },
          { label: 'Age', field: 'age' },
          { label: 'Ear tag no.', field: 'tag' },
          { label: 'Colour and identification marks', field: 'colour' },
          { label: 'Lactation no.', field: 'lactation' },
          { label: 'Milk yield (litres/day)', field: 'yield' },
          { label: 'Pregnancy status', field: 'preg' },
          { label: 'General health', field: 'health' },
        ],
      },
    ],
  },
  {
    key: 'postmortem',
    name: 'Post-mortem report',
    titleEn: 'Post-Mortem Examination Report',
    titleTe: 'శవ పరీక్ష నివేదిక',
    numberPrefix: 'PM',
    fields: [
      ...ANIMAL_FIELDS,
      { id: 'deathTime', label: 'Date and time of death', type: 'datetime-local' },
      { id: 'pmTime', label: 'Date and time of post-mortem', type: 'datetime-local' },
      { id: 'place', label: 'Place of post-mortem' },
      { id: 'requested', label: 'Requested by', type: 'select', options: ['Owner', 'Insurance company', 'Police', 'Court'] },
      { id: 'history', label: 'History', type: 'textarea', full: true },
      { id: 'external', label: 'External examination', type: 'textarea', full: true },
      { id: 'internal', label: 'Internal examination', type: 'textarea', full: true },
      { id: 'cause', label: 'Cause of death (opinion)', type: 'textarea', full: true },
      { id: 'samples', label: 'Samples sent to lab', full: true },
    ],
    body: [
      {
        type: 'paragraph',
        text: 'Post-mortem examination was conducted on the carcass of the animal described below, belonging to Sri/Smt. {{owner}} of {{addr}}, at {{place}} on {{pmTime|datetime}}, at the request of the {{requested|lower}}.',
      },
      {
        type: 'table',
        rows: [
          { label: 'Species / breed', field: 'species,breed' },
          { label: 'Sex / age', field: 'sex,age' },
          { label: 'Ear tag no.', field: 'tag' },
          { label: 'Identification marks', field: 'colour' },
          { label: 'Date and time of death', field: 'deathTime', filter: 'datetime' },
        ],
      },
      { type: 'heading', text: 'History' },
      { type: 'paragraph', text: '{{history}}' },
      { type: 'heading', text: 'External examination' },
      { type: 'paragraph', text: '{{external}}' },
      { type: 'heading', text: 'Internal examination' },
      { type: 'paragraph', text: '{{internal}}' },
      { type: 'heading', text: 'Cause of death' },
      { type: 'paragraph', text: '<b>{{cause}}</b>' },
      { type: 'heading', text: 'Samples sent for laboratory examination' },
      { type: 'paragraph', text: '{{samples|default:Nil}}' },
    ],
  },
];

async function main() {
  const now = new Date().toISOString();
  for (const template of TEMPLATES) {
    const existing = await adminDb.collection('certificateTemplates').where('key', '==', template.key).limit(1).get();
    if (!existing.empty) {
      await existing.docs[0].ref.set({ ...template, published: true, updatedAt: now }, { merge: true });
      console.log(`Updated template: ${template.key}`);
      continue;
    }
    await adminDb.collection('certificateTemplates').add({
      ...template,
      published: true,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created template: ${template.key}`);
  }
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
