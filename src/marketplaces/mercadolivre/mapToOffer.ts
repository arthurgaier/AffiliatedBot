import type { Offer } from "../offer.js";
import type { MlItem } from "./schemas.js";

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function mapToOffer(item: MlItem): Offer | null {
  if (item.status !== "active") {
    return null;
  }
  return {
    marketplace: "mercadolivre",
    itemId: item.id,
    title: item.title,
    price: item.price,
    currency: item.currency_id,
    permalink: item.permalink,
    // thumbnail vem solto no schema (não queremos rejeitar a oferta inteira por causa
    // de uma miniatura malformada) — valida aqui, na borda antes de virar photoUrl do Telegram.
    thumbnail: item.thumbnail && isValidUrl(item.thumbnail) ? item.thumbnail : undefined,
    availableQuantity: item.available_quantity,
    status: item.status,
  };
}
