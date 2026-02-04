import { encryptForUser } from "./user-keys.js";
import { grantUserAccess } from "./key-store.js";

export function shareFile(cid, ownerFileKey, targetUserId, targetUserPublicKey, ttlMinutes) {
  var encryptedKey = encryptForUser(ownerFileKey, targetUserPublicKey);

  var expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();

  grantUserAccess(cid, targetUserId, encryptedKey, expiresAt);
}