import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import dotenv from "dotenv";
import uploadRouter from "./upload.js";
import { FileRecord } from "./db.js";
import { Web3Storage } from "web3.storage";
import authRoutes, { auth } from "./auth.js";

dotenv.config();






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

if (!CONTRACT_ADDRESS) {
  throw new Error("CONTRACT_ADDRESS is missing");
}

if (!ethers.isAddress(CONTRACT_ADDRESS)) {
  throw new Error("CONTRACT_ADDRESS is not a valid Ethereum address");
}



const PROVIDER_URL = null;

let contract = null;

if (PRIVATE_KEY && CONTRACT_ADDRESS && PROVIDER_URL) {
  try {
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
  } catch (e) {
    console.warn("⚠️ Blockchain disabled:", e.message);
  }
}
/*  DISABLE BLOCK CHAIN now 
const PROVIDER_URL = process.env.PROVIDER_URL;
// Set up blockchain connection (using Infura, Alchemy, etc.)
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const abi = [
  "function registerFile(uint256 userId, string cid, string filename) public"
];
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
*/
// ====== AUTH ======
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordhash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1d" });
  res.json({ token });
});



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
    // Bypass the admin check for now, assuming the user is an admin for testing
    // If there's no admin email logic yet, we just proceed
    const userId = req.user.id; // Get the user ID from the token

    // Simulate fetching files for user IDs 1..10 (for testing purposes)
    const results = [];

    // Loop through user IDs (for demonstration, we use 1 to 10 as placeholders)
    for (let i = 1; i <= 10; i++) {
      // For testing, we simulate that all users have files
      const files = [
        { fileName: `File_${i}_1.txt`, cid: `cid_example_${i}_1` },
        { fileName: `File_${i}_2.txt`, cid: `cid_example_${i}_2` },
      ];

      // Add the simulated files to the results array
      results.push({ userId: i, files });
    }

    // Return the collected results
    if (results.length > 0) {
      res.json(results);
    } else {
      res.status(404).json({ message: "No files found for any users" });
    }
  } catch (err) {
    console.error("Error fetching admin data:", err);
    res.status(500).json({ message: "Failed to fetch admin data due to server error" });
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



  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
  

