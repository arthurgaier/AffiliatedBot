import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./config/env.js";
import { shouldSkipAsDuplicate } from "./deals/dedupe.js";
import { isRealOffer } from "./deals/isRealOffer.js";
import { loadState, recordObservation, recordPosted, saveState } from "./deals/priceHistory.js";
import { logger } from "./logger.js";
import { buildAffiliateLink } from "./marketplaces/mercadolivre/affiliateLink.js";
import { refreshAccessToken } from "./marketplaces/mercadolivre/auth.js";
import { getItem, searchItemIds } from "./marketplaces/mercadolivre/client.js";
import { mapToOffer } from "./marketplaces/mercadolivre/mapToOffer.js";
import { readTokenFile, writeTokenFile } from "./marketplaces/mercadolivre/tokenStore.js";
import { sendOfferMessage } from "./telegram/client.js";
import { formatOfferMessage } from "./telegram/formatMessage.js";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "state.json");
const TOKEN_PATH = path.join(DATA_DIR, "ml-token.enc");
const WATCHLIST_PATH = path.join(process.cwd(), "config", "watchlist.json");

interface Watchlist {
  itemIds: string[];
  searchQueries?: string[];
}

async function loadWatchlist(): Promise<Watchlist> {
  const contents = await readFile(WATCHLIST_PATH, "utf8");
  return JSON.parse(contents) as Watchlist;
}

export async function run(): Promise<void> {
  const env = loadEnv();
  const watchlist = await loadWatchlist();
  let state = await loadState(STATE_PATH);

  const refreshToken = await readTokenFile(TOKEN_PATH, env.ML_TOKEN_ENCRYPTION_KEY);
  const tokenResponse = await refreshAccessToken(refreshToken, {
    clientId: env.ML_CLIENT_ID,
    clientSecret: env.ML_CLIENT_SECRET,
  });
  // Salva o refresh_token novo imediatamente: o ML invalida o antigo a cada troca,
  // então se o resto do run falhar depois daqui, o próximo run ainda precisa conseguir autenticar.
  await writeTokenFile(TOKEN_PATH, tokenResponse.refresh_token, env.ML_TOKEN_ENCRYPTION_KEY);

  const candidateIds = new Set(watchlist.itemIds);
  for (const query of watchlist.searchQueries ?? []) {
    try {
      const ids = await searchItemIds(query, tokenResponse.access_token);
      for (const id of ids) candidateIds.add(id);
    } catch (error) {
      logger.warn("Busca por palavra-chave falhou, seguindo só com a watchlist", {
        query,
        error: String(error),
      });
    }
  }

  let posted = 0;
  try {
    for (const itemId of candidateIds) {
      const item = await getItem(itemId, tokenResponse.access_token);
      if (!item) continue;

      const offer = mapToOffer(item);
      if (!offer) continue;

      const existingHistory = state.items[offer.itemId];
      const offerCheck = isRealOffer(existingHistory, offer.price, env.DISCOUNT_THRESHOLD_PERCENT);

      const recorded = recordObservation(state, offer.itemId, offer.price);
      state = recorded.state;

      if (!offerCheck.isReal) {
        logger.info("Oferta ignorada", { itemId: offer.itemId, reason: offerCheck.reason });
        continue;
      }

      if (shouldSkipAsDuplicate(state.posted[offer.itemId], offer.price, env.DISCOUNT_THRESHOLD_PERCENT)) {
        logger.info("Oferta já postada recentemente, pulando", { itemId: offer.itemId });
        continue;
      }

      const affiliateUrl = buildAffiliateLink(offer.permalink, env.ML_AFFILIATE_MATT_WORD, env.ML_AFFILIATE_MATT_TOOL);
      const text = formatOfferMessage({
        offer,
        affiliateUrl,
        discountPercent: offerCheck.discountPercent ?? 0,
      });

      await sendOfferMessage({
        botToken: env.TELEGRAM_BOT_TOKEN,
        chatId: env.TELEGRAM_CHANNEL_ID,
        text,
        photoUrl: offer.thumbnail,
      });

      state = recordPosted(state, offer.itemId, offer.price);
      posted += 1;
      logger.info("Oferta postada", { itemId: offer.itemId, price: offer.price });
    }
  } finally {
    await saveState(STATE_PATH, state);
  }

  logger.info("Execução concluída", { candidatos: candidateIds.size, postadas: posted });
}

run().catch((error) => {
  logger.error("Execução falhou", { error: error instanceof Error ? (error.stack ?? error.message) : String(error) });
  process.exitCode = 1;
});
