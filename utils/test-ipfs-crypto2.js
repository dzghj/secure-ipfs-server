import fs from "fs";
import path from "path";
import { ipfs } from "./ipfs-client.js";
import { generateKey, encrypt, decrypt } from "./crypto-utils.js";
import { generateUserKeyPair, decryptForUser } from "./user-keys.js";
import { saveFileMetadata, getUserKey, getFileMetadata } from "./key-store.js";
import { shareFile } from "./share-api.js";
import crypto from "crypto";

// SHA256 utility
function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Safe IPFS add with retries
async function safeIpfsAdd(buffer, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await ipfs.add(buffer);
    } catch (e) {
      console.warn(`IPFS add failed (attempt ${i + 1}): ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// Safe IPFS cat with retries
async function safeIpfsCat(cid, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const chunks = [];
      for await (let chunk of ipfs.cat(cid)) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (e) {
      console.warn(`IPFS cat failed (attempt ${i + 1}): ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function testEncryptedFlow() {
  try {
    // Users
    const alice = generateUserKeyPair();
    const bob = generateUserKeyPair();
    const charlie = generateUserKeyPair(); // permanent access

    // Read file
    const filePath = path.resolve("./test-files/test.pdf");
    const originalBuffer = fs.readFileSync(filePath);

    // Encrypt file
    const fileKey = generateKey();
    const enc = encrypt(originalBuffer, fileKey);

    // Compute SHA256 hash
    const fileHash = sha256(originalBuffer);

    // Upload encrypted file
    const upload = await safeIpfsAdd(enc.encrypted);
    const cid = upload.cid.toString();

    // Save metadata with hash
    saveFileMetadata(cid, enc.iv, enc.authTag, fileHash);

    // Share with Alice (60 min)
    shareFile(cid, fileKey, "alice", alice.publicKey, 60);

    // Share with Bob (5 min)
    shareFile(cid, fileKey, "bob", bob.publicKey, 5);

    // Share with Charlie permanently
    shareFile(cid, fileKey, "charlie", charlie.publicKey);

    // --- Download & decrypt tests ---

    // Bob downloads
    const bobEncrypted = await safeIpfsCat(cid);
    const bobRecord = getUserKey(cid, "bob");
    if (!bobRecord) throw new Error("Bob access denied or expired");

    const bobDecryptedKey = decryptForUser(bobRecord.encryptedKey, bob.privateKey);
    const bobMeta = getFileMetadata(cid);
    const bobDecrypted = decrypt(bobEncrypted, bobDecryptedKey, bobMeta.iv, bobMeta.authTag);

    if (sha256(bobDecrypted) !== bobMeta.hash) {
      throw new Error("Bob file integrity check failed!");
    }
    fs.writeFileSync("./test-files/bob.pdf", bobDecrypted);
    console.log("✅ Bob decrypted successfully and integrity verified");

    // Charlie downloads (permanent access)
    const charlieEncrypted = await safeIpfsCat(cid);
    const charlieRecord = getUserKey(cid, "charlie");
    if (!charlieRecord) throw new Error("Charlie access denied");

    const charlieDecryptedKey = decryptForUser(charlieRecord.encryptedKey, charlie.privateKey);
    const charlieMeta = getFileMetadata(cid);
    const charlieDecrypted = decrypt(charlieEncrypted, charlieDecryptedKey, charlieMeta.iv, charlieMeta.authTag);

    if (sha256(charlieDecrypted) !== charlieMeta.hash) {
      throw new Error("Charlie file integrity check failed!");
    }
    fs.writeFileSync("./test-files/charlie.pdf", charlieDecrypted);
    console.log("✅ Charlie decrypted successfully (permanent access) and integrity verified");

    // --- Optional: simulate Bob's TTL expiry ---
    console.log("⏳ Simulating Bob TTL expiry...");
    await new Promise(r => setTimeout(r, 6000)); // wait 6 sec (adjust for testing)
    const bobExpiredRecord = getUserKey(cid, "bob");
    if (!bobExpiredRecord) {
      console.log("✅ Bob access correctly expired");
    } else {
      console.log("⚠️ Bob access still valid (TTL simulation too short)");
    }

  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

testEncryptedFlow();