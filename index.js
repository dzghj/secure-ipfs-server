import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import uploadRouter from "./upload.js";
import { FileRecord } from "./db.js";
import { Web3Storage, File } from "web3.storage";
import authRoutes, { auth } from "./auth.js";






const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use("/api/upload", uploadRouter);
app.use("/api/auth", authRoutes);

const users = [
  { email: "admin@example.com", password: bcrypt.hashSync("password123", 8), id: 1 }
];

const SECRET = process.env.JWT_SECRET || "supersecret";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PROVIDER_URL = process.env.PROVIDER_URL;

// Set up blockchain connection (using Infura, Alchemy, etc.)
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const abi = [
  "function registerFile(uint256 userId, string cid, string filename) public"
];
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// ====== AUTH ======
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1d" });
  res.json({ token });
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ====== REGISTER CID ======
app.post("/api/registerCID", auth, async (req, res) => {
  const { cid, filename } = req.body;
  try {
    console.log("Registering file on blockchain:", cid, filename);
    const tx = await contract.registerFile(req.user.id, cid, filename);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Blockchain registration failed" });
  }
});

// ======= ADMIN DASHBOARD =======
app.get("/api/admin/files", auth, async (req, res) => {
    try {
      if (req.user.email !== "admin@example.com")
        return res.status(403).json({ message: "Access denied" });
  
      // Example: for demo we fetch all user IDs 1..10
      const results = [];
      for (let i = 1; i <= 10; i++) {
        const files = await contract.getUserFiles(i);
        if (files.length > 0)
          results.push({ userId: i, files });
      }
      res.json(results);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch admin data" });
    }
  });
  
  // ======= USER DASHBOARD =======
  app.get("/api/myfiles", auth, async (req, res) => {
    try {
      const files = await contract.getUserFiles(req.user.id);
      res.json(files);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch user files" });
    }
  });
  //
  const web3Client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });

app.post("/api/registerCID", auth, async (req, res) => {
  const { cid, filename } = req.body;
  const fileRec = await FileRecord.findOne({ where: { filename, userId: req.user.id } });
  if (!fileRec) return res.status(404).json({ message: "File not found" });

  try {
    const tx = await contract.registerFile(req.user.id, cid, filename);
    await tx.wait();

    fileRec.cid = cid;
    fileRec.status = "registered";
    await fileRec.save();

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Blockchain registration failed" });
  }
});


app.listen(4000, () => console.log("✅ Server running on port 4000"));


