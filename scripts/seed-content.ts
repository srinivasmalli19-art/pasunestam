// Seeds the sample content for the public modules (prices/news/admissions/
// cases), transcribed verbatim from pasunestam.html's own PRODUCTS/NEWS/ADS/
// CASES arrays — flagged as sample data exactly as the prototype's own
// footer already discloses. Run with:
//   npm run db:seed:content
// Works against either the Firebase Local Emulator Suite or a real project,
// same as scripts/seed-templates.ts.

import type { Product } from '../lib/prices/types';
import type { Article } from '../lib/news/types';
import type { Admission } from '../lib/admissions/types';
import type { Case } from '../lib/cases/types';
import type { Scheme } from '../lib/schemes/types';

type SeedProduct = Omit<Product, 'id'>;
type SeedArticle = Omit<Article, 'id'>;
type SeedAdmission = Omit<Admission, 'id'>;
type SeedCase = Omit<Case, 'id'>;
type SeedScheme = Omit<Scheme, 'id'>;

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local (e.g. running against the emulator with env vars already
  // exported in the shell) — that's fine, keep going.
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Ivermectin injection 1%, 50 ml',
    category: 'Medicines',
    offers: [
      { store: 'VetMart', price: 385, ship: 0, days: 2 },
      { store: 'AgroKart', price: 342, ship: 40, days: 4 },
      { store: 'FarmCare Store', price: 360, ship: 0, days: 3 },
      { store: 'MedsDirect', price: 329, ship: 60, days: 5 },
    ],
  },
  {
    name: 'Calcium and phosphorus oral gel, 300 g',
    category: 'Supplements',
    offers: [
      { store: 'VetMart', price: 240, ship: 0, days: 2 },
      { store: 'AgroKart', price: 215, ship: 30, days: 3 },
      { store: 'FarmCare Store', price: 228, ship: 0, days: 4 },
    ],
  },
  {
    name: 'Mineral mixture, 5 kg',
    category: 'Supplements',
    offers: [
      { store: 'VetMart', price: 620, ship: 50, days: 3 },
      { store: 'AgroKart', price: 590, ship: 0, days: 4 },
      { store: 'FarmCare Store', price: 575, ship: 80, days: 5 },
      { store: 'MedsDirect', price: 640, ship: 0, days: 2 },
    ],
  },
  {
    name: 'Digital veterinary thermometer',
    category: 'Instruments',
    offers: [
      { store: 'VetMart', price: 450, ship: 0, days: 2 },
      { store: 'MedsDirect', price: 399, ship: 49, days: 3 },
      { store: 'AgroKart', price: 420, ship: 0, days: 4 },
    ],
  },
  {
    name: 'Shoulder-length examination gloves, 100',
    category: 'Consumables',
    offers: [
      { store: 'VetMart', price: 780, ship: 0, days: 2 },
      { store: 'AgroKart', price: 699, ship: 60, days: 4 },
      { store: 'FarmCare Store', price: 720, ship: 0, days: 3 },
      { store: 'MedsDirect', price: 745, ship: 0, days: 2 },
    ],
  },
  {
    name: 'Ear tag applicator',
    category: 'Instruments',
    offers: [
      { store: 'VetMart', price: 1150, ship: 0, days: 3 },
      { store: 'AgroKart', price: 990, ship: 90, days: 5 },
      { store: 'FarmCare Store', price: 1050, ship: 0, days: 4 },
    ],
  },
];

const ARTICLES: SeedArticle[] = [
  {
    category: 'Technology',
    title: 'Portable ultrasound reaches village dispensaries',
    excerpt:
      'Handheld scanners that pair with a phone are making early pregnancy diagnosis possible on the farm, not only at the hospital.',
    date: '2026-09-10',
    readMinutes: 4,
  },
  {
    category: 'Disease alerts',
    title: 'Lumpy skin disease: monsoon vaccination checklist',
    excerpt: 'Vector control, ring vaccination and isolation steps to follow when a case is reported nearby.',
    date: '2026-09-08',
    readMinutes: 3,
  },
  {
    category: 'Technology',
    title: 'Muzzle-print recognition trials for insurance claims',
    excerpt: 'Photo-based cattle identification could replace lost ear tags when a claim is filed.',
    date: '2026-09-05',
    readMinutes: 5,
  },
  {
    category: 'Breeding',
    title: 'Sex-sorted semen: what to tell farmers about conception rates',
    excerpt: 'Setting honest expectations, and which animals give the best results.',
    date: '2026-09-02',
    readMinutes: 6,
  },
  {
    category: 'Policy',
    title: 'Digital animal health records: getting your dispensary ready',
    excerpt: 'How tagging, vaccination and treatment entries are moving to one online record per animal.',
    date: '2026-08-29',
    readMinutes: 4,
  },
  {
    category: 'Disease alerts',
    title: 'Canine rabies: post-exposure advice for pet owners',
    excerpt: 'A one-page handout you can print for owners after a bite.',
    date: '2026-08-26',
    readMinutes: 2,
  },
];

const ADMISSIONS: SeedAdmission[] = [
  {
    day: '15',
    month: 'Sep',
    title: 'B.V.Sc & A.H. 2026 — state quota counselling, phase 1',
    org: 'State veterinary university',
    status: 'Open',
    sortDate: '2026-09-15',
  },
  {
    day: '22',
    month: 'Sep',
    title: '15% all-India quota — round 2 choice filling',
    org: 'Veterinary Council of India',
    status: 'Closing',
    sortDate: '2026-09-22',
  },
  {
    day: '05',
    month: 'Oct',
    title: 'M.V.Sc and Ph.D entrance — applications',
    org: 'State veterinary universities',
    status: 'Upcoming',
    sortDate: '2026-10-05',
  },
  {
    day: '12',
    month: 'Oct',
    title: 'Diploma in Animal Husbandry — spot admissions',
    org: 'Animal Husbandry Polytechnics',
    status: 'Upcoming',
    sortDate: '2026-10-12',
  },
  {
    day: '30',
    month: 'Oct',
    title: 'CPD workshop: small animal ultrasonography',
    org: 'Continuing education',
    status: 'Upcoming',
    sortDate: '2026-10-30',
  },
];

async function upsertByField<T extends Record<string, unknown>>(
  collection: string,
  rows: T[],
  keyField: keyof T
) {
  const { adminDb } = await import('../lib/firebase/admin');
  const existing = await adminDb.collection(collection).get();
  const existingByKey = new Map(existing.docs.map((d) => [d.data()[keyField as string], d.ref]));

  for (const row of rows) {
    const ref = existingByKey.get(row[keyField]);
    if (ref) {
      await ref.set(row, { merge: true });
      console.log(`Updated ${collection}: ${row[keyField]}`);
    } else {
      await adminDb.collection(collection).add(row);
      console.log(`Created ${collection}: ${row[keyField]}`);
    }
  }
}

const CASES: SeedCase[] = [
  {
    title: 'Traumatic reticulopericarditis in a crossbred HF cow: rumenotomy and recovery',
    species: 'Cattle',
    body: 'Presented with reduced appetite and grunting on movement; wire-piece foreign body confirmed and removed via rumenotomy, with full recovery over the following two weeks.',
    submittedBy: 'seed',
    submitterName: 'Dr. M. Lakshmi, Veterinary Hospital',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    title: 'Dystocia due to schistosomus reflexus in a Murrah buffalo',
    species: 'Buffalo',
    body: 'A rare fetal malformation causing dystocia at term; managed via fetotomy after manual correction attempts failed, dam recovered without complication.',
    submittedBy: 'seed',
    submitterName: 'Dr. R. Prasad, Veterinary Dispensary',
    status: 'published',
    createdAt: '2026-09-03T00:00:00.000Z',
  },
  {
    title: 'Canine parvoviral enteritis: fluid therapy outcomes in 12 pups',
    species: 'Dog',
    body: 'A litter outbreak treated with aggressive IV fluid therapy and supportive care; 10 of 12 pups survived to full recovery.',
    submittedBy: 'seed',
    submitterName: 'Dr. S. Anjali, Pet Clinic',
    status: 'published',
    createdAt: '2026-09-05T00:00:00.000Z',
  },
  {
    title: 'Infectious bursal disease outbreak investigation on a broiler farm',
    species: 'Poultry',
    body: 'Sudden mortality spike in a 4-week broiler flock; lab-confirmed IBD, with biosecurity and vaccination-schedule recommendations for the farm.',
    submittedBy: 'seed',
    submitterName: 'Dr. T. Naresh, Poultry Diagnostic Lab',
    status: 'published',
    createdAt: '2026-09-07T00:00:00.000Z',
  },
];

const SCHEMES: SeedScheme[] = [
  {
    name: 'National Livestock Mission — entrepreneurship',
    tag: 'Central',
    description: 'Individuals, FPOs and SHGs setting up poultry, sheep, goat, pig or fodder units.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  {
    name: 'Rashtriya Gokul Mission',
    tag: 'Central',
    description: 'Breed improvement of indigenous cattle and buffalo, breeding farms and AI services.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-02T00:00:00.000Z',
  },
  {
    name: 'Animal Husbandry Infrastructure Development Fund',
    tag: 'Central',
    description: 'Dairy, meat processing and feed plants, with interest subvention on loans.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-03T00:00:00.000Z',
  },
  {
    name: 'Kisan Credit Card — animal husbandry',
    tag: 'Credit',
    description: 'Working capital for dairy, sheep, goat and poultry farmers through banks.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-04T00:00:00.000Z',
  },
  {
    name: 'Livestock insurance — proposal form',
    tag: 'Insurance',
    description: 'Enrol cattle, buffalo, sheep and goats. Needs ear tag and valuation certificate.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-05T00:00:00.000Z',
  },
  {
    name: 'Livestock insurance — death claim',
    tag: 'Insurance',
    description: 'Claim with post-mortem report, ear tag and photographs of the carcass.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-06T00:00:00.000Z',
  },
  {
    name: 'FMD vaccination and tagging register',
    tag: 'Registers',
    description: 'Village-wise record of vaccination and ear tagging for each round.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-07T00:00:00.000Z',
  },
  {
    name: 'Fodder seed and mini-kit application',
    tag: 'State',
    description: 'Subsidised fodder seed for farmers with milch animals. Use your district form.',
    fileUrl: null,
    fileName: null,
    createdBy: null,
    createdAt: '2026-08-08T00:00:00.000Z',
  },
];

async function main() {
  await upsertByField('products', PRODUCTS, 'name');
  await upsertByField('articles', ARTICLES, 'title');
  await upsertByField('admissions', ADMISSIONS, 'title');
  await upsertByField('cases', CASES, 'title');
  await upsertByField('schemes', SCHEMES, 'name');
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
