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

type SeedProduct = Omit<Product, 'id'>;
type SeedArticle = Omit<Article, 'id'>;
type SeedAdmission = Omit<Admission, 'id'>;

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

async function main() {
  await upsertByField('products', PRODUCTS, 'name');
  await upsertByField('articles', ARTICLES, 'title');
  await upsertByField('admissions', ADMISSIONS, 'title');
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
