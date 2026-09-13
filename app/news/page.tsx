import NewsBrowser from '@/components/news/NewsBrowser';
import { getArticles } from '@/lib/news/queries';

export default async function NewsPage() {
  const articles = await getArticles();
  return <NewsBrowser articles={articles} />;
}
