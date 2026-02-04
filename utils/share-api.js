import { encryptForUser } from "./user-keys.js";
import { grantUserAccess } from "./key-store.js";

/**
 * Share a file with a user
 * @param {string} cid - IPFS CID of the file
 * @param {Buffer} fileKey - AES key of the file
 * @param {string} userId - user identifier
 * @param {string} userPublicKey - user's RSA public key
 * @param {number} [ttlMinutes] - optional time-to-live in minutes; if omitted, access is permanent
 */
export function shareFile(cid, fileKey, userId, userPublicKey, ttlMinutes) {
  const encryptedKey = encryptForUser(fileKey, userPublicKey);

  // Calculate expiry time if ttlMinutes provided, otherwise undefined for permanent access
  const expiresAt = ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined;

  grantUserAccess(cid, userId, encryptedKey, expiresAt);
}