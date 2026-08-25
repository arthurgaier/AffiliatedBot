export interface Offer {
  marketplace: "mercadolivre";
  itemId: string;
  title: string;
  price: number;
  currency: string;
  permalink: string;
  thumbnail?: string;
  availableQuantity: number;
  status: string;
}
