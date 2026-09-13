import PricesBrowser from '@/components/prices/PricesBrowser';
import { getProducts } from '@/lib/prices/queries';

export default async function PricesPage() {
  const products = await getProducts();
  return <PricesBrowser products={products} />;
}
