// Seeds the sample content for the public modules (prices/news/admissions/
// cases), transcribed verbatim from pasunestam.html's own PRODUCTS/NEWS/ADS/
// CASES arrays — flagged as sample data exactly as the prototype's own
// footer already discloses. Run with:
//   npm run db:seed:content
// Works against either the Firebase Local Emulator Suite or a real project,
// same as scripts/seed-templates.ts.

import type { Product } from '../lib/prices/types';

type SeedProduct = Omit<Product, 'id'>;

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

async function main() {
  const { adminDb } = await import('../lib/firebase/admin');

  const existing = await adminDb.collection('products').get();
  const existingByName = new Map(existing.docs.map((d) => [d.data().name as string, d.ref]));

  for (const product of PRODUCTS) {
    const ref = existingByName.get(product.name);
    if (ref) {
      await ref.set(product, { merge: true });
      console.log(`Updated product: ${product.name}`);
    } else {
      await adminDb.collection('products').add(product);
      console.log(`Created product: ${product.name}`);
    }
  }
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
