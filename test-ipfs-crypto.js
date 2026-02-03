import fs from "fs";
import path from "path";
import { ipfs } from "./ipfs-client.js";
import { generateKey, encrypt, decrypt } from "./crypto-utils.js";

async function testEncryptedFlow() {
  try {
    const filePath = path.resolve("./test-files/imm5644e.pdf");
    const originalBuffer = fs.readFileSync(filePath);

    console.log("🔐 Encrypting PDF...");
    const key = generateKey();
    const { iv, authTag, encrypted } = encrypt(originalBuffer, key);

    console.log("⬆️ Uploading encrypted file to IPFS...");
    const uploadResult = await ipfs.add(encrypted);
    const cid = uploadResult.cid.toString();

    console.log("✅ Uploaded");
    console.log("CID:", cid);

    console.log("⬇️ Downloading encrypted file from IPFS...");
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const downloadedEncrypted = Buffer.concat(chunks);

    console.log("🔓 Decrypting...");
    const decryptedBuffer = decrypt(
      downloadedEncrypted,
      key,
      iv,
      authTag
    );

    const outPath = path.resolve("./test-files/decrypted.pdf");
    fs.writeFileSync(outPath, decryptedBuffer);

    console.log("✅ Decryption successful");
    console.log("📄 Saved decrypted file to:", outPath);

    // Optional integrity check
    console.log(
      "Integrity match:",
      Buffer.compare(originalBuffer, decryptedBuffer) === 0
    );

  } catch (err) {
    console.error("❌ Encrypted IPFS test failed:", err);
  }
}

testEncryptedFlow();
