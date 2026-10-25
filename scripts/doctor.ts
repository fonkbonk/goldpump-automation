import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";
import { capMonsterBalance } from "../src/captcha/capmonster.js";
import { listAccounts } from "../src/db/accounts.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

console.log("GoldPump automation doctor\n");

console.log(`.env: ${fs.existsSync(envPath) ? "yes" : "missing (copy .env.example)"}`);

const cfg = loadConfig();
console.log(`CAPMONSTER_API_KEY: ${cfg.CAPMONSTER_API_KEY ? "set" : "missing"}`);
console.log(`ENCRYPTION_KEY: ${cfg.ENCRYPTION_KEY ? "set" : "missing"}`);
console.log(`API: ${cfg.GOLDPUMP_API_BASE}`);
console.log(`Turnstile sitekey: ${cfg.GOLDPUMP_TURNSTILE_SITEKEY}`);

try {
  const bal = await capMonsterBalance();
  console.log(`CapMonster balance: ${bal != null ? `$${bal}` : "n/a"}`);
} catch (e) {
  console.log(`CapMonster balance check failed: ${e instanceof Error ? e.message : e}`);
}

console.log(`Accounts: ${listAccounts().length}`);
