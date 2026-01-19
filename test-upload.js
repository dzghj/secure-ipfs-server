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
async function testEncryptedUpload() {
  try {
    console.log("🧪 Starting encrypted upload test...");

    // ---- Simulated user + file ----
    const userId = 1; // must exist in DB
    const testFilePath = path.resolve("./test-files/test.txt");

    if (!fs.existsSync(testFilePath)) {
      throw new Error("Test file does not exist: test-files/test.txt");
    }

    const originalFilename = "test.txt";
    const mimeType = "text/plain";

    // ---- Read plaintext file ----
    const fileBuffer = fs.readFileSync(testFilePath);

    // ---- Encrypt ----
    const { encrypted, iv, authTag } = encryptBuffer(fileBuffer);

    // ---- Write encrypted file ----
    const storedFilename = `${crypto.randomUUID()}.enc`;
    const encryptedPath = path.join(uploadDir, storedFilename);
    fs.writeFileSync(encryptedPath, encrypted);

    // ---- Save DB record ----
   

    const record = await FileRecord.create({
        userId,
        filename: originalFilename,                 // ✅ required by model
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

/**
 * ▶️ RUN TEST DIRECTLY
 */
testEncryptedUpload();
