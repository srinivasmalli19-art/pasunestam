export interface Offer {
  store: string;
  price: number;
  ship: number;
  days: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  offers: Offer[];
}
