import express from "express";
import { User } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "supersecret";

// Register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email + password required" });

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(400).json({ message: "Email already exists" });

  const hashed = bcrypt.hashSync(password, 8);
  const user = await User.create({ email, password: hashed });
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

// Login
/*
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});
*/
// TEST LOGIN (always succeeds)
router.post("/login", async (req, res) => {
  const { email } = req.body;

  const fakeUser = {
    id: 1,
    email: email || "test@example.com",
    role: "user"
  };

  const token = jwt.sign(fakeUser, SECRET, { expiresIn: "1d" });

  res.json({
    token,
    user: fakeUser
  });
});


// Auth middleware
export function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// POST /api/keyholder/publickey
// Body: { publicKeyPem: "-----BEGIN PUBLIC KEY-----...." }
router.post("/keyholder/publickey", auth, async (req, res) => {
  // auth middleware should populate req.user with { role, id, email, assignedUserId }
  if (!req.user || req.user.role !== "keyholder") return res.status(403).json({ message: "Forbidden" });

  const { publicKeyPem } = req.body;
  if (!publicKeyPem) return res.status(400).json({ message: "publicKeyPem required" });

  const kh = await Keyholder.findByPk(req.user.id);
  if (!kh) return res.status(404).json({ message: "Keyholder not found" });

  kh.publicKey = publicKeyPem;
  await kh.save();
  res.json({ success: true, message: "Public key saved" });
});


export default router;
