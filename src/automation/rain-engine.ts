import { solveGoldPumpTurnstile } from "../captcha/capmonster.js";
import {
  getAccountCookie,
  listRainAccounts,
  recordRainJoin,
  updateBalance,
} from "../db/accounts.js";
import type { RainDocument } from "../goldpump/types.js";
import { createGoldPumpHttp, loginAuto, rainJoin } from "../goldpump/http.js";
import { GoldPumpRainListener } from "../goldpump/socket.js";
import { loadConfig } from "../config.js";
import { log } from "../util/log.js";
import { maybeWagerAfterRain } from "./wager-limbo.js";

let joinInFlight = false;
let lastRainKey = "";
/** accountId:rainRoundKey — avoid duplicate joins for the same rain round */
const joinedRound = new Set<string>();

function rainRoundKey(rain: RainDocument | undefined): string {
  if (!rain) return "";
  const end = rain.endDate instanceof Date ? rain.endDate.toISOString() : String(rain.endDate ?? "");
  return `${rain.status ?? ""}:${end}`;
}

async function joinAllAccounts(rain: RainDocument): Promise<void> {
  if (joinInFlight) return;
  joinInFlight = true;
  try {
    let captchaToken: string | null = null;
    const accounts = listRainAccounts();
    if (!accounts.length) {
      log("warn", "No accounts with rain enabled");
      return;
    }

    const roundKey = rainRoundKey(rain);
    for (const row of accounts) {
      const dedupeKey = `${row.id}:${roundKey}`;
      if (joinedRound.has(dedupeKey)) continue;

      const cookie = getAccountCookie(row);
      const http = createGoldPumpHttp(cookie);
      try {
        const session = await loginAuto(http);
        if (!session.authenticated) {
          recordRainJoin(row.id, rain.status, false, "Session expired — paste fresh cookies");
          continue;
        }
        if (session.document?.balance != null) {
          updateBalance(row.id, session.document.balance);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordRainJoin(row.id, rain.status, false, msg);
        continue;
      }

      try {
        if (!captchaToken) {
          log("info", "Solving Turnstile via CapMonster for rain join…");
          captchaToken = await solveGoldPumpTurnstile();
        }
        await rainJoin(http, captchaToken);
        joinedRound.add(dedupeKey);
        recordRainJoin(row.id, rain.status, true, "Joined rain");
        log("info", "Joined rain", { nickname: row.nickname });
        await maybeWagerAfterRain(row.nickname, cookie);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        recordRainJoin(row.id, rain.status, false, msg);
        log("warn", "Rain join failed", { nickname: row.nickname, error: msg });
        if (/captcha|turnstile|token/i.test(msg)) {
          captchaToken = null;
        }
      }
    }
  } finally {
    joinInFlight = false;
  }
}

export async function runRainEngine(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.CAPMONSTER_API_KEY?.trim()) {
    throw new Error("CAPMONSTER_API_KEY is required in goldpump-automation/.env");
  }

  const accounts = listRainAccounts();
  if (!accounts.length) {
    throw new Error("Add at least one account: npm run add-account");
  }

  const listenerCookie = getAccountCookie(accounts[0]!);
  log("info", "Starting GoldPump rain engine (CapMonster Turnstile)", {
    accounts: accounts.length,
    listener: accounts[0]!.nickname,
  });

  const listener = new GoldPumpRainListener(listenerCookie);
  await listener.start({
    onRain: (rain) => {
      const key = rainRoundKey(rain);
      if (key && key !== lastRainKey) {
        lastRainKey = key;
        log("debug", "Rain update", {
          status: rain?.status,
          endDate: rain?.endDate,
        });
      }
      if (rain?.status === "in progress") {
        void joinAllAccounts(rain);
      }
    },
    onPoolValue: (value) => {
      log("debug", "Rain pool value", { value });
    },
  });

  await new Promise<void>(() => {
    /* run until process exit */
  });
}
