// AES-256-GCM helpers for storing platform API keys in the DB.
// Uses ENCRYPTION_KEY from env (32-byte base64).
// Format of ciphertext: base64(iv) + ":" + base64(tag) + ":" + base64(cipher).
// NEVER log decrypted values.

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALG = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard
const KEY_BYTES = 32; // 256-bit

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY env var is not set. Generate one with: openssl rand -base64 32",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Use a base64-encoded 32-byte key.`,
    );
  }
  return key;
}

export function encrypt(plain: string): string {
  if (typeof plain !== "string") throw new Error("encrypt: input must be string");
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    iv.toString("base64") +
    ":" +
    tag.toString("base64") +
    ":" +
    enc.toString("base64")
  );
}

export function decrypt(cipherText: string): string {
  if (typeof cipherText !== "string") {
    throw new Error("decrypt: input must be string");
  }
  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    throw new Error("decrypt: malformed ciphertext (expected 'iv:tag:enc')");
  }
  const [ivB64, tagB64, encB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/** Mask helper for log/UI display — never reveal full key. */
export function maskKey(plainOrCipher: string): string {
  if (!plainOrCipher) return "—";
  const s = String(plainOrCipher);
  if (s.length <= 8) return "•".repeat(s.length);
  return s.slice(0, 4) + "•".repeat(Math.max(4, s.length - 8)) + s.slice(-4);
}
