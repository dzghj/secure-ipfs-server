import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { FileRecord } from "./db.js";

const router = express.Router();
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${req.body.uploadId}_${req.body.chunkIndex}`);
  },
});
const upload = multer({ storage });

// Upload a chunk
router.post("/chunk", upload.single("chunk"), (req, res) => {
  res.json({ status: "chunk received" });
});

// Merge chunks
router.post("/merge", async (req, res) => {
  const { uploadId, totalChunks, filename, userId } = req.body;
  const finalPath = path.join(uploadDir, filename);
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(uploadDir, `${uploadId}_${i}`);
    const chunk = fs.readFileSync(chunkPath);
    writeStream.write(chunk);
    fs.unlinkSync(chunkPath);
  }
  writeStream.end();

  await FileRecord.create({ userId, filename, status: "uploaded" });
  res.json({ message: "File merged", filePath: finalPath });
});

export default router;
