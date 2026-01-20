import fs from "fs";
import path from "path";
import crypto from "crypto";
import { FileRecord } from "./db.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config();

/**
 * 📁 Upload directory
 */
const uploadDir = path.resolve("./uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 🔐 Encryption config (same as production)
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

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * 🧪 TEST FUNCTION
 */
async function testEncryptedUpload11() {
  try {
    console.log("🧪 Starting encrypted upload test...");

    // ---- Simulated user + file ----
    const userId = 1; // must exist in DB
    // 👉 Path to your test PDF
    const pdfPath = path.resolve("./test-files/MyWill.pdf");

    // ✅ Get filename automatically
    const filename = path.basename(pdfPath);

    // ✅ Read PDF buffer
    const fileBuffer = fs.readFileSync(pdfPath);

    // 🔐 Encrypt (same logic as server)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      Buffer.from(process.env.FILE_ENCRYPTION_KEY, "hex"),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // 💾 Save encrypted file locally (optional, but useful)
    const encryptedPath = path.resolve(
      "./uploads",
      `${filename}.enc`
    );
    fs.writeFileSync(encryptedPath, encrypted);


    // ---- Save DB record ----
   

    const record = await FileRecord.create({
        userId,
        filename: filename,                 // ✅ required by model
        cid: "bafyFAKECID_TEST_123456",        // ✅ fake CID for test
        sha256Hash: crypto
          .createHash("sha256")
          .update(encrypted)
          .digest("hex"),
      });

    console.log("✅ Upload + encryption successful!");
    console.log({
      id: record.id,
      originalFilename: record.originalFilename,
      storedFilename: record.storedFilename,
      iv: record.iv,
      authTag: record.authTag,
    });

  } catch (err) {
    console.error("❌ Encrypted upload test failed:", err);
  }
}
function decryptBuffer(encryptedBuffer, ivHex, authTagHex) {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(ivHex, "hex")
    );
  
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  
    return Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);
  }

  async function testEncryptedUpload() {
    try {
      console.log("🧪 Starting encrypted upload test...");
  
      const userId = 1; // must exist
      const pdfPath = path.resolve("./test-files/MyWill.pdf");
  
      // ✅ Auto filename
      const filename = path.basename(pdfPath);
  
      // ✅ Read original PDF
      const originalBuffer = fs.readFileSync(pdfPath);
  
      // 🔐 Encrypt
      const { encrypted, iv, authTag } = encryptBuffer(originalBuffer);
  
      // 💾 Save encrypted file (simulate server storage / IPFS)
      const encryptedPath = path.resolve("./uploads", `${filename}.enc`);
      fs.writeFileSync(encryptedPath, encrypted);
  
      // 🧾 Save DB record (FAKE CID OK for now)
      const record = await FileRecord.create({
        userId,
        filename,                         // REQUIRED
        cid: "bafyFAKECID_TEST_123456",    // FAKE CID
        sha256Hash: crypto
          .createHash("sha256")
          .update(originalBuffer)
          .digest("hex"),
      });
  
      console.log("✅ Upload + encryption successful!");
      console.log("Record ID:", record.id);
  
      // ==================================================
      // ⬇️ DOWNLOAD + DECRYPT TEST
      // ==================================================
  
      console.log("⬇️ Starting download + decrypt test...");
  
      // 📥 Simulate download (read encrypted file)
      const downloadedEncrypted = fs.readFileSync(encryptedPath);
  
      // 🔓 Decrypt
      const decryptedBuffer = decryptBuffer(
        downloadedEncrypted,
        iv,
        authTag
      );
  
      // 💾 Save decrypted file
      const decryptedPath = path.resolve(
        "./downloads",
        `DECRYPTED_${filename}`
      );
  
      if (!fs.existsSync("./downloads")) {
        fs.mkdirSync("./downloads");
      }
  
      fs.writeFileSync(decryptedPath, decryptedBuffer);
  
      // 🔍 Verify integrity
      const decryptedHash = crypto
        .createHash("sha256")
        .update(decryptedBuffer)
        .digest("hex");
  
      console.log("📄 Original SHA256 :", record.sha256Hash);
      console.log("📄 Decrypted SHA256:", decryptedHash);
  
      if (decryptedHash === record.sha256Hash) {
        console.log("✅ SUCCESS: Decrypted file matches original!");
      } else {
        console.error("❌ ERROR: File integrity mismatch!");
      }
  
      console.log("📁 Decrypted file saved at:", decryptedPath);
  
    } catch (err) {
      console.error("❌ Encrypted upload test failed:", err);
    }
  }
  
/**
 * ▶️ RUN TEST DIRECTLY
 */
testEncryptedUpload();
