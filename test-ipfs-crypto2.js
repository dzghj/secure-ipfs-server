import { generateUserKeyPair, decryptForUser } from "./user-keys.js";
import { saveFileMetadata, getUserKey } from "./key-store.js";
import { shareFile } from "./share-api.js";

async function testEncryptedFlow() {
  try {
    // Users
    var alice = generateUserKeyPair();
    var bob = generateUserKeyPair();

    // Encrypt file (UNCHANGED)
    var key = generateKey();
    var enc = encrypt(originalBuffer, key);

    var uploadResult = await ipfs.add(enc.encrypted);
    var cid = uploadResult.cid.toString();

    saveFileMetadata(cid, enc.iv, enc.authTag);

    // Grant Alice access
    shareFile(cid, key, "alice", alice.publicKey, 60);

    // Share with Bob later
    shareFile(cid, key, "bob", bob.publicKey, 5);

    // Bob downloads
    var record = getUserKey(cid, "bob");
    if (!record || isExpired(record.expiresAt)) {
      throw new Error("Access expired");
    }

    var fileKey = decryptForUser(record.encryptedKey, bob.privateKey);

    // Decrypt file
    var decrypted = decrypt(downloadedEncrypted, fileKey, enc.iv, enc.authTag);
    fs.writeFileSync("./test-files/bob.pdf", decrypted);

    console.log("✅ Bob decrypted successfully");

  } catch (e) {
    console.error(e);
  }
}