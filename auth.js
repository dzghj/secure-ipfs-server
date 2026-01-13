import express from "express";
import { User } from "./db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend"; // ✅ important


const router = express.Router();
const SECRET = process.env.JWT_SECRET || "supersecret";

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email + password required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = bcrypt.hashSync(password, 8);

    const user = await User.create({
      email,
      passwordHash, // ✅ FIXED
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Register failed" });
  }
});

// Login

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("User req.body ",req.body);
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});
/*
// TEST LOGIN (always succeeds)
router.post("/login", async (req, res) => {
  const email = req.body?.email || "test@example.com";

  const token = jwt.sign(
    { id: 1, email, role: "user" },
    SECRET,
    { expiresIn: "1d" }
  );

  res.json({
    token,
    user: { id: 1, email }
  });
});
*/
// initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // fetch user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "No user with that email" });
    }

    // generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // assign to user and save
    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;
    await user.save();

    // construct reset link
    const clientUrl = process.env.CLIENT_URL.replace(/\/$/, "");
    const resetLink = `${clientUrl}/reset-password/${resetToken}`;

    // send email via Resend
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here</a> to reset your password.</p>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.json({ message: "Password reset email sent" });
    console.log(`✅ Password reset email sent to ${email}`);

  } catch (err) {
    console.error("❌ Forgot password route failed:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Reset password
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({ where: { resetToken: token } });
  if (!user) return res.status(400).json({ message: "Invalid token" });

  if (Date.now() > user.resetTokenExpiry)
    return res.status(400).json({ message: "Token expired" });

  user.passwordHash = bcrypt.hashSync(newPassword, 8);
  user.resetToken = null;
  user.resetTokenExpiry = null;

  await user.save();
  res.json({ message: "Password has been reset successfully" });
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
