import { loadConfig } from "../config.js";
import { createGoldPumpHttp, limboPlay, loginAuto } from "../goldpump/http.js";
import { log } from "../util/log.js";

export async function maybeWagerAfterRain(
  nickname: string,
  cookieHeader: string,
): Promise<void> {
  const cfg = loadConfig();
  const fraction = cfg.AUTO_WAGER_LIMBO_FRACTION;
  if (fraction <= 0) return;

  const http = createGoldPumpHttp(cookieHeader);
  const session = await loginAuto(http);
  const balance = session.document?.balance;
  if (balance == null || balance <= 0) {
    log("debug", "Skip limbo wager — no balance", { nickname });
    return;
  }
  const bet = Math.max(cfg.MIN_LIMBO_BET, Math.floor(balance * fraction));
  if (bet <= 0 || bet > balance) return;

  try {
    const result = await limboPlay(http, bet, cfg.LIMBO_MULTIPLIER);
    log("info", "Limbo wager placed", {
      nickname,
      bet,
      multiplier: cfg.LIMBO_MULTIPLIER,
      won: result.won,
      roll: result.roll,
    });
  } catch (err) {
    log("warn", "Limbo wager failed", {
      nickname,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
