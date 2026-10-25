import { loadConfig } from "../config.js";

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export function log(level: keyof typeof levels, message: string, meta?: Record<string, unknown>): void {
  const min = levels[loadConfig().LOG_LEVEL] ?? 1;
  if (levels[level] < min) return;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](`[${ts}] [${level}] ${line}`);
}
