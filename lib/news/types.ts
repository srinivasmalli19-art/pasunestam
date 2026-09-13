export interface Article {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  date: string; // ISO date
  readMinutes: number;
}
