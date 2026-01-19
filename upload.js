import fs from "fs";
import path from "path";
import crypto from "crypto";
import express from "express";
import multer from "multer";
import { FileRecord } from "./db.js";

const router = express.Router();

/**
 * 📁 Upload directory
 */
const uploadDir = path.resolve("./uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 🔐 Encryption config
 */
const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = Buffer.from(
  process.env.FILE_ENCRYPTION_KEY,
  "hex"
);

// Safety check
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("FILE_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}

/**
 * 🧾 Allowed file types
 */
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain",
];

/**
 * 📦 Multer config (store TEMP file only)
 */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, crypto.randomUUID());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  },
});

/**
 * 🔐 Encrypt file buffer
 */
function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12); // required size for GCM
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
 * 🚀 POST /upload
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { userId } = req.body;
    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Missing userId" });
    }

    // Read plaintext file
    const fileBuffer = fs.readFileSync(req.file.path);

    // 🔥 Remove plaintext immediately
    fs.unlinkSync(req.file.path);

    // Encrypt
    const { encrypted, iv, authTag } = encryptBuffer(fileBuffer);

    const encryptedFilename = `${req.file.filename}.enc`;
    const encryptedPath = path.join(uploadDir, encryptedFilename);

    fs.writeFileSync(encryptedPath, encrypted);

    // Save DB record
    const record = await FileRecord.create({
      userId,
      originalFilename: req.file.originalname,
      storedFilename: encryptedFilename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      iv,
      authTag,
      status: "encrypted",
    });

    res.json({
      message: "File uploaded and encrypted successfully",
      file: {
        id: record.id,
        name: record.originalFilename,
        size: record.size,
        type: record.mimeType,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
