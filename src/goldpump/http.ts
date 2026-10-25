import axios, { type AxiosInstance } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { loadConfig } from "../config.js";
import type { LoginAutoResponse } from "./types.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function createGoldPumpHttp(cookieHeader: string): AxiosInstance {
  const cfg = loadConfig();
  const proxy = cfg.GOLDPUMP_PROXY_URL?.trim();
  const client = axios.create({
    baseURL: cfg.GOLDPUMP_API_BASE,
    withCredentials: true,
    timeout: 45_000,
    headers: {
      "User-Agent": UA,
      Cookie: cookieHeader,
      Accept: "application/json, text/plain, */*",
      Origin: cfg.GOLDPUMP_SITE_URL.replace(/\/$/, ""),
      Referer: cfg.GOLDPUMP_SITE_URL,
    },
    validateStatus: (s) => s < 500,
  });
  if (proxy) {
    const agent = new HttpsProxyAgent(proxy);
    client.defaults.httpAgent = agent;
    client.defaults.httpsAgent = agent;
  }
  return client;
}

function cloudflareBlocked(data: unknown, status: number): boolean {
  if (status === 403 || status === 503) return true;
  if (typeof data !== "string") return false;
  return (
    data.includes("cf-error-details") ||
    data.includes("Attention Required! | Cloudflare") ||
    data.includes("Sorry, you have been blocked")
  );
}

function assertOk(data: unknown, status: number): void {
  if (cloudflareBlocked(data, status)) {
    throw new Error(
      "Cloudflare blocked requests from this server IP (common on VPS/datacenter hosts). " +
        "Set GOLDPUMP_PROXY_URL in .env to a residential or ISP proxy, or ask your host to use a clean IP. " +
        "Your SID can still be valid — the block happens before GoldPump sees it.",
    );
  }
  if (status === 420) throw new Error("Not available in your region.");
  if (status === 444) throw new Error("Please reroll your seed.");
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: unknown }).error));
  }
  if (typeof data === "string") {
    if (data.trimStart().startsWith("<!DOCTYPE") || data.trimStart().startsWith("<html")) {
      throw new Error(
        "GoldPump returned HTML instead of JSON (often Cloudflare). Try a proxy via GOLDPUMP_PROXY_URL.",
      );
    }
    if (data.toLowerCase().includes("error")) {
      throw new Error(data.length > 300 ? `${data.slice(0, 300)}…` : data);
    }
  }
}

export async function loginAuto(client: AxiosInstance): Promise<LoginAutoResponse> {
  const res = await client.post(
    "/api/account/login-auto",
    null,
    { headers: { "x-anti-csrf": "true" } },
  );
  assertOk(res.data, res.status);
  return res.data as LoginAutoResponse;
}

export async function authSocket(client: AxiosInstance, socketId: string): Promise<void> {
  const res = await client.post("api/account/auth-socket", null, {
    headers: { "x-anti-csrf": "true" },
    params: { socketId },
  });
  assertOk(res.data, res.status);
}

export async function rainJoin(client: AxiosInstance, captchaToken: string): Promise<unknown> {
  const res = await client.post(
    "/api/rain/rain-join",
    {},
    {
      headers: { "x-anti-csrf": "true" },
      params: { captchaToken },
    },
  );
  assertOk(res.data, res.status);
  return res.data;
}

export async function limboPlay(
  client: AxiosInstance,
  betAmount: number,
  multiplier: number,
): Promise<{ roll?: number; won?: boolean }> {
  const res = await client.post(
    "/api/limbo/limbo-play",
    {},
    {
      headers: { "x-anti-csrf": "true" },
      params: { betAmount, multiplier },
    },
  );
  assertOk(res.data, res.status);
  return res.data as { roll?: number; won?: boolean };
}
