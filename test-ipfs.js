import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { create } from "ipfs-http-client";
import { FileRecord } from "./db.js";


dotenv.config();

/**
 * 🔐 Encryption config
 */
const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = Buffer.from(
  process.env.FILE_ENCRYPTION_KEY,
  "hex"
);

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("FILE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}

/**
 * 🔐 Encrypt buffer
 */
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * 🔓 Decrypt buffer
 */
function decryptBuffer(encrypted, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}

/**
 * 🌐 IPFS client (Infura)
 */
const ipfs = create({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

/**
 * 🧪 TEST: Encrypt → IPFS → Download → Decrypt
 */

 import { ipfs } from "./ipfs-client.js";

 async function testUpload() {
   try {
     const filePath = path.resolve("./test-files/sample.pdf"); // adjust
     const fileBuffer = fs.readFileSync(filePath);
 
     console.log("⬆️ Uploading file to remote IPFS node...");
 
     const result = await ipfs.add(fileBuffer);
 
     console.log("✅ File uploaded!");
     console.log("CID:", result.cid.toString());
   } catch (err) {
     console.error("❌ Upload failed:", err);
   }
 }
 
 testUpload();
async function testIpfsEncryptedUpload() {
  try {
    console.log("🧪 Starting IPFS encrypted upload test...");

    const userId = 1; // must exist
    const pdfPath = path.resolve("./test-files/imm5644e.pdf");
    const filename = path.basename(pdfPath);

    // 📄 Read original file
    const fileBuffer = fs.readFileSync(pdfPath);

    // 🔐 Encrypt
    const { encrypted, iv, authTag } = encryptBuffer(fileBuffer);

    // 🌐 Upload encrypted bytes to IPFS
    console.log("⬆️ Uploading encrypted file to IPFS...");
    const ipfsResult = await ipfs.add(encrypted);
    const cid = ipfsResult.cid.toString();

    console.log("✅ IPFS upload successful");
    console.log("CID:", cid);

    // 🧾 Save DB record
    const record = await FileRecord.create({
      userId,
      filename,
      cid,
      sha256Hash: crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex"),
      iv,
      authTag,
    });

    console.log("💾 DB record saved:", record.id);

    // ==================================================
    // ⬇️ DOWNLOAD + DECRYPT FROM IPFS
    // ==================================================

    console.log("⬇️ Downloading encrypted file from IPFS...");

    let downloadedEncrypted = Buffer.alloc(0);
    for await (const chunk of ipfs.cat(cid)) {
      downloadedEncrypted = Buffer.concat([downloadedEncrypted, chunk]);
    }

    // 🔓 Decrypt
    const decrypted = decryptBuffer(
      downloadedEncrypted,
      iv,
      authTag
    );

    // 📁 Save decrypted file
    const outputDir = "./downloads";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(
      outputDir,
      `DECRYPTED_${filename}`
    );
    fs.writeFileSync(outputPath, decrypted);

    // 🔍 Integrity check
    const decryptedHash = crypto
      .createHash("sha256")
      .update(decrypted)
      .digest("hex");

    console.log("📄 Original SHA256 :", record.sha256Hash);
    console.log("📄 Decrypted SHA256:", decryptedHash);

    if (decryptedHash === record.sha256Hash) {
      console.log("✅ SUCCESS: IPFS decrypt verified!");
    } else {
      console.error("❌ HASH MISMATCH!");
    }

    console.log("📁 Decrypted file saved at:", outputPath);

  } catch (err) {
    console.error("❌ IPFS encrypted test failed:", err);
  }
}

/**
 * ▶️ RUN TEST
 */
testIpfsEncryptedUpload();
