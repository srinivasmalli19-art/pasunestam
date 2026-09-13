// One-time seed for the three certificate templates, run with:
//   npm run db:seed
// Works against either the Firebase Local Emulator Suite (set
// FIRESTORE_EMULATOR_HOST first, e.g. via `npm run emulators` in another
// terminal) or a real project (via .env.local's service account).
//
// Health certificate: matches the user's real "Health and Valuation
// Certificate" paper form (uploaded 2026-09-13) — shared owner/village/
// mandal details once, then a repeatable "Particulars and description of
// the Milch Animal(s)" table, one column per animal.
//
// Valuation/post-mortem: still PLACEHOLDER wording from pasunestam.html —
// the user's real documents for those two haven't been provided yet.
// Replace once available, same as health certificate was just replaced.

import type { CertificateBodyBlock, CertificateField } from '../lib/certificates/types';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local (e.g. running purely against the emulator with env vars
  // already exported in the shell) — that's fine, keep going.
}

interface SeedTemplate {
  key: string;
  name: string;
  titleEn: string;
  titleTe: string;
  numberPrefix: string;
  fields: CertificateField[];
  animalFields?: CertificateField[];
  body: CertificateBodyBlock[];
}

const SPECIES_OPTIONS = ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Dog', 'Cat', 'Horse', 'Pig', 'Poultry'];

const HEALTH_ANIMAL_FIELDS: CertificateField[] = [
  { id: 'species', label: 'Type of animal', type: 'select', options: SPECIES_OPTIONS },
  { id: 'breed', label: 'Breed' },
  { id: 'age', label: 'Age (years)' },
  { id: 'lactations', label: 'No. of lactations' },
  { id: 'milkYield', label: 'Avg. milk yield (litres/day)' },
  { id: 'tagNo', label: 'Animal tag no.' },
  { id: 'calfPresent', label: 'Calf present (Yes/No, M/F)' },
  { id: 'height', label: 'Height (cms)' },
  { id: 'length', label: 'Length (cms)' },
  { id: 'hornTip', label: 'Tip of horns (cms)' },
  { id: 'hornBase', label: 'Base of horns (cms)' },
  { id: 'hornLengthRight', label: 'Horn length — right (cms)' },
  { id: 'hornLengthLeft', label: 'Horn length — left (cms)' },
  { id: 'tailLength', label: 'Tail length (cms)' },
  { id: 'tailSwitch', label: 'Switch of the tail' },
  { id: 'price', label: 'Present market price (₹)' },
];

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
    titleEn: 'Health and Valuation Certificate',
    titleTe: 'ఆరోగ్య మరియు విలువ ధృవీకరణ పత్రం',
    numberPrefix: 'HC',
    fields: [
      { id: 'owner', label: "Owner's name", required: true },
      { id: 'guardian', label: 'S/o. / W/o.' },
      { id: 'village', label: 'Village' },
      { id: 'mandal', label: 'Mandal' },
      { id: 'examDate', label: 'Date of examination', type: 'date' },
    ],
    animalFields: HEALTH_ANIMAL_FIELDS,
    body: [
      {
        type: 'paragraph',
        text: 'Certified that the animal(s) described below belong(s) to Sri/Smt. {{owner}}{{#if guardian}}, S/o. / W/o. {{guardian}}{{/if}} of {{village}}, {{mandal}} Mandal, presented on {{examDate|date}} for the purpose of health and valuation certification.',
      },
      {
        type: 'heading',
        text: 'Particulars and description of the animal(s)',
      },
      {
        type: 'animal-table',
        rows: HEALTH_ANIMAL_FIELDS.map((f) => ({ label: f.label, field: f.id })),
      },
      {
        type: 'paragraph',
        text: 'Certified that the health of the above animal(s) is/are in good condition at the time of examination.',
      },
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
  // A dynamic import, not a static one: static `import`s are hoisted above
  // all other top-level code (including the loadEnvFile call above), which
  // would make lib/firebase/admin.ts initialize before .env.local is loaded.
  const { adminDb } = await import('../lib/firebase/admin');

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
