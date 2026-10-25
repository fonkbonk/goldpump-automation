/** Build a Cookie header from full header, name=value, or raw session value (SID). */
export function normalizeCookieHeader(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("=")) return trimmed;
  const name = (process.env.GOLDPUMP_SESSION_COOKIE_NAME ?? "SID").trim();
  return `${name}=${trimmed}`;
}
