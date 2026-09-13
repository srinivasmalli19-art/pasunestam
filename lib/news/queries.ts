import { adminDb } from '@/lib/firebase/admin';
import type { Article } from './types';

export async function getArticles(): Promise<Article[]> {
  const snap = await adminDb.collection('articles').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Article)
    .sort((a, b) => b.date.localeCompare(a.date));
}
