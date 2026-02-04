import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const KEY_LENGTH = 32; // 256 bits

// In production: derive this from user password or KMS
export function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

export function encrypt(buffer, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    iv,
    authTag,
    encrypted,
  };
}

export function decrypt(encrypted, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}
