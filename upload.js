import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { FileRecord } from "./db.js";

const router = express.Router();

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer storage
 */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * Single file upload
 * POST /upload
 * form-data:
 *  - file
 *  - userId
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { userId } = req.body;

    const record = await FileRecord.create({
      userId,
      filename: req.file.originalname,
      path: req.file.path,
      status: "uploaded",
    });

    res.json({
      message: "File uploaded successfully",
      file: {
        id: record.id,
        filename: record.filename,
        path: record.path,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;