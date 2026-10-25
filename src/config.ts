import dotenv from "dotenv";
import { z } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

/** Blank lines in .env (e.g. CAPMONSTER_API_KEY=) must not fail min(1). */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const envSchema = z.object({
  CAPMONSTER_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  ENCRYPTION_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GOLDPUMP_API_BASE: z.string().url().default("https://api.goldpump.com"),
  GOLDPUMP_SITE_URL: z.string().url().default("https://goldpump.com/"),
  GOLDPUMP_TURNSTILE_SITEKEY: z.string().default("0x4AAAAAACLmkLF8v68bkhrE"),
  GOLDPUMP_PROXY_URL: z.string().optional(),
  DATABASE_PATH: z.string().default("./data/goldpump-automation.db"),
  AUTO_WAGER_LIMBO_FRACTION: z.coerce.number().min(0).max(1).default(0),
  LIMBO_MULTIPLIER: z.coerce.number().min(1.01).default(2),
  MIN_LIMBO_BET: z.coerce.number().min(0).default(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export function reloadEnv(): void {
  cached = null;
  dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });
}
