var keyDB = {}; // replace later with real DB

export function saveFileMetadata(cid, iv, authTag) {
  keyDB[cid] = {
    iv: iv,
    authTag: authTag,
    users: {}
  };
}

export function grantUserAccess(cid, userId, encryptedKey, expiresAt) {
  keyDB[cid].users[userId] = {
    encryptedKey: encryptedKey,
    expiresAt: expiresAt
  };
}

export function revokeUserAccess(cid, userId) {
  delete keyDB[cid].users[userId];
}

export function getUserKey(cid, userId) {
  return keyDB[cid] && keyDB[cid].users[userId];
}