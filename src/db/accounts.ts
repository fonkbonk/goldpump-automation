import { decryptSecret, encryptSecret } from "../util/crypto.js";
import { getDb, type AccountRow } from "./schema.js";

export function listAccounts(): AccountRow[] {
  return getDb()
    .prepare("SELECT * FROM accounts ORDER BY id")
    .all() as AccountRow[];
}

export function listRainAccounts(): AccountRow[] {
  return getDb()
    .prepare("SELECT * FROM accounts WHERE rain_enabled = 1 ORDER BY id")
    .all() as AccountRow[];
}

export function getAccountCookie(row: AccountRow): string {
  return decryptSecret(row.cookie_ciphertext);
}

export function upsertAccount(nickname: string, cookieHeader: string): AccountRow {
  const now = Date.now();
  const cipher = encryptSecret(cookieHeader.trim());
  const existing = getDb()
    .prepare("SELECT id FROM accounts WHERE nickname = ?")
    .get(nickname) as { id: number } | undefined;
  if (existing) {
    getDb()
      .prepare(
        "UPDATE accounts SET cookie_ciphertext = ?, last_join_error = NULL WHERE id = ?",
      )
      .run(cipher, existing.id);
    return getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(existing.id) as AccountRow;
  }
  const info = getDb()
    .prepare(
      "INSERT INTO accounts (nickname, cookie_ciphertext, created_at_ms) VALUES (?, ?, ?)",
    )
    .run(nickname, cipher, now);
  return getDb()
    .prepare("SELECT * FROM accounts WHERE id = ?")
    .get(info.lastInsertRowid) as AccountRow;
}

export function recordRainJoin(
  accountId: number,
  rainStatus: string | undefined,
  success: boolean,
  message: string,
): void {
  getDb()
    .prepare(
      "INSERT INTO rain_events (account_id, rain_status, success, message, created_at_ms) VALUES (?, ?, ?, ?, ?)",
    )
    .run(accountId, rainStatus ?? null, success ? 1 : 0, message.slice(0, 500), Date.now());
  getDb()
    .prepare(
      "UPDATE accounts SET last_join_at_ms = ?, last_join_error = ?, rain_enabled = rain_enabled WHERE id = ?",
    )
    .run(Date.now(), success ? null : message.slice(0, 500), accountId);
}

export function updateBalance(accountId: number, balance: number | null): void {
  getDb().prepare("UPDATE accounts SET last_balance = ? WHERE id = ?").run(balance, accountId);
}
