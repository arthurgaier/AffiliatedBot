import { describe, expect, it } from "vitest";
import type { Offer } from "../src/marketplaces/offer.js";
import { formatOfferMessage } from "../src/telegram/formatMessage.js";

const baseOffer: Offer = {
  marketplace: "mercadolivre",
  itemId: "MLB123",
  title: "Fone de ouvido <bluetooth> & cia",
  price: 89.9,
  currency: "BRL",
  permalink: "https://produto.mercadolivre.com.br/MLB123",
  availableQuantity: 5,
  status: "active",
};

describe("formatOfferMessage", () => {
  it("escapa caracteres HTML do título", () => {
    const message = formatOfferMessage({ offer: baseOffer, affiliateUrl: "https://x.com", discountPercent: 20 });
    expect(message).not.toContain("<bluetooth>");
    expect(message).toContain("&lt;bluetooth&gt;");
    expect(message).toContain("&amp;");
  });

  it("formata o preço em BRL", () => {
    const message = formatOfferMessage({ offer: baseOffer, affiliateUrl: "https://x.com", discountPercent: 20 });
    expect(message).toContain("R$");
    expect(message).toContain("89,90");
  });

  it("mantém a mensagem dentro do limite de caption do Telegram", () => {
    const longTitleOffer = { ...baseOffer, title: "A".repeat(2000) };
    const message = formatOfferMessage({ offer: longTitleOffer, affiliateUrl: "https://x.com", discountPercent: 20 });
    expect(message.length).toBeLessThanOrEqual(1024);
  });
});
