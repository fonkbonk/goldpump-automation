import { fetch } from "undici";
import { loadConfig } from "../config.js";

const CREATE = "https://api.capmonster.cloud/createTask";
const RESULT = "https://api.capmonster.cloud/getTaskResult";

type CreateResp = { errorId?: number; taskId?: number; errorCode?: string; errorDescription?: string };
type PollResp = {
  errorId?: number;
  status?: string;
  errorCode?: string;
  errorDescription?: string;
  solution?: { gRecaptchaResponse?: string; token?: string };
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new Error(`CapMonster invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`CapMonster HTTP ${res.status}`);
  }
  return json;
}

export async function capMonsterBalance(): Promise<number | null> {
  const clientKey = loadConfig().CAPMONSTER_API_KEY?.trim();
  if (!clientKey) return null;
  const json = await postJson<{ errorId?: number; balance?: number; errorDescription?: string }>(
    "https://api.capmonster.cloud/getBalance",
    { clientKey },
  );
  if (json.errorId && json.errorId !== 0) {
    throw new Error(json.errorDescription ?? "CapMonster getBalance failed");
  }
  return json.balance ?? null;
}

/** GoldPump rain join uses Cloudflare Turnstile (same sitekey as login). */
export async function solveGoldPumpTurnstile(): Promise<string> {
  const cfg = loadConfig();
  const clientKey = cfg.CAPMONSTER_API_KEY?.trim();
  if (!clientKey) {
    throw new Error("Set CAPMONSTER_API_KEY in goldpump-automation/.env");
  }
  const task = {
    type: "TurnstileTaskProxyless",
    websiteURL: cfg.GOLDPUMP_SITE_URL,
    websiteKey: cfg.GOLDPUMP_TURNSTILE_SITEKEY,
  };
  const created = await postJson<CreateResp>(CREATE, { clientKey, task });
  if (created.errorId && created.errorId !== 0) {
    throw new Error(created.errorDescription ?? created.errorCode ?? "CapMonster createTask failed");
  }
  if (created.taskId == null) {
    throw new Error("CapMonster createTask returned no taskId");
  }
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2_500));
    const poll = await postJson<PollResp>(RESULT, { clientKey, taskId: created.taskId });
    if (poll.errorId && poll.errorId !== 0) {
      throw new Error(poll.errorDescription ?? poll.errorCode ?? "CapMonster getTaskResult failed");
    }
    if (poll.status === "ready") {
      const token = poll.solution?.token ?? poll.solution?.gRecaptchaResponse;
      if (!token) throw new Error("CapMonster returned empty Turnstile token");
      return token;
    }
  }
  throw new Error("CapMonster Turnstile solve timed out");
}
