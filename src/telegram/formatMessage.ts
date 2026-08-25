import type { Offer } from "../marketplaces/offer.js";

const MAX_CAPTION_LENGTH = 1024;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface FormatMessageInput {
  offer: Offer;
  affiliateUrl: string;
  discountPercent: number;
}

function buildMessage(title: string, offer: Offer, affiliateUrl: string, discountPercent: number): string {
  const price = formatBRL(offer.price);
  const discount = discountPercent.toFixed(0);
  return (
    `<b>${title}</b>\n\n` +
    `${discount}% de queda — por ${price}\n\n` +
    `<a href="${affiliateUrl}">Ver oferta</a>`
  );
}

export function formatOfferMessage({ offer, affiliateUrl, discountPercent }: FormatMessageInput): string {
  const fullTitle = escapeHtml(offer.title);
  let message = buildMessage(fullTitle, offer, affiliateUrl, discountPercent);

  if (message.length > MAX_CAPTION_LENGTH) {
    const overflow = message.length - MAX_CAPTION_LENGTH;
    const maxTitleLength = Math.max(offer.title.length - overflow - 1, 0);
    const truncatedTitle = escapeHtml(`${offer.title.slice(0, maxTitleLength)}…`);
    message = buildMessage(truncatedTitle, offer, affiliateUrl, discountPercent);
  }

  return message;
}
