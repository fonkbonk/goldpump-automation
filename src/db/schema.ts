import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config.js";

export type AccountRow = {
  id: number;
  nickname: string;
  cookie_ciphertext: string;
  rain_enabled: number;
  last_join_at_ms: number | null;
  last_join_error: string | null;
  last_balance: number | null;
  created_at_ms: number;
};

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const cfg = loadConfig();
  const file = path.resolve(cfg.DATABASE_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL UNIQUE,
      cookie_ciphertext TEXT NOT NULL,
      rain_enabled INTEGER NOT NULL DEFAULT 1,
      last_join_at_ms INTEGER,
      last_join_error TEXT,
      last_balance REAL,
      created_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rain_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      rain_status TEXT,
      success INTEGER NOT NULL,
      message TEXT,
      created_at_ms INTEGER NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);
  return db;
}
