// key-store.js
// soft revoke + audit logs + file integrity hash

var keyDB = {};
var auditLog = [];

function logAction(action, cid, userId, meta) {
  auditLog.push({
    action,
    cid,
    userId: userId || null,
    meta: meta || {},
    timestamp: Date.now()
  });
}

export function saveFileMetadata(cid, iv, authTag, hash) {
  keyDB[cid] = {
    iv,
    authTag,
    hash, // SHA256 of original file
    users: {}
  };

  logAction("UPLOAD", cid);
}

export function grantUserAccess(cid, userId, encryptedKey, expiresAt) {
  if (!keyDB[cid]) throw new Error("File metadata not found");

  keyDB[cid].users[userId] = {
    encryptedKey,
    expiresAt, // can be undefined → permanent access
    revoked: false,
    revokedAt: null
  };

  logAction("GRANT_ACCESS", cid, userId, { expiresAt });
}

export function revokeUserAccess(cid, userId) {
  if (!keyDB[cid] || !keyDB[cid].users[userId]) return;

  keyDB[cid].users[userId].revoked = true;
  keyDB[cid].users[userId].revokedAt = Date.now();

  logAction("REVOKE_ACCESS", cid, userId);
}

export function getUserKey(cid, userId) {
  const record = keyDB[cid]?.users?.[userId];
  if (!record) return null;
  if (record.revoked) return null;

  const expiresAt = record.expiresAt ?? Infinity; // default to never expires
  if (expiresAt < Date.now()) return null;

  return record;
}

export function getFileMetadata(cid) {
  return keyDB[cid];
}

export function getAuditLog() {
  return auditLog;
}
