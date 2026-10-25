import crypto from "node:crypto";
import { loadConfig } from "../config.js";

function keyBytes(): Buffer {
  const raw = loadConfig().ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Set ENCRYPTION_KEY in .env (openssl rand -base64 32)");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to 32 bytes (openssl rand -base64 32)");
  }
  return buf;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
