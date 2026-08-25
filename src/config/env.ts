import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN é obrigatório"),
  TELEGRAM_CHANNEL_ID: z.string().min(1, "TELEGRAM_CHANNEL_ID é obrigatório"),
  ML_CLIENT_ID: z.string().min(1, "ML_CLIENT_ID é obrigatório"),
  ML_CLIENT_SECRET: z.string().min(1, "ML_CLIENT_SECRET é obrigatório"),
  ML_TOKEN_ENCRYPTION_KEY: z.string().min(1, "ML_TOKEN_ENCRYPTION_KEY é obrigatório"),
  ML_AFFILIATE_MATT_WORD: z.string().min(1, "ML_AFFILIATE_MATT_WORD é obrigatório"),
  ML_AFFILIATE_MATT_TOOL: z.string().min(1, "ML_AFFILIATE_MATT_TOOL é obrigatório"),
  DISCOUNT_THRESHOLD_PERCENT: z.coerce.number().positive().default(15),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Configuração inválida:\n${issues}`);
  }
  return result.data;
}
