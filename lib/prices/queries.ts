import { adminDb } from '@/lib/firebase/admin';
import type { Product } from './types';

const PRODUCTS = 'products';

// A handful of editor-managed rows — fetch all, sort in code, same pattern
// as certificate templates.
export async function getProducts(): Promise<Product[]> {
  const snap = await adminDb.collection(PRODUCTS).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product).sort((a, b) => a.name.localeCompare(b.name));
}
