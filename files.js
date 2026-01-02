import express from "express";
import fetch from "node-fetch"; // npm i node-fetch@2 or use built-in fetch in newer node
import { FileRecord, AccessLog } from "./db.js";
import { ethers } from "ethers";
const router = express.Router();

/**
 * GET /api/files/:id/view
 * - permission: owner OR keyholder assigned to owner
 * - behavior: log attempt, return CID and optionally stream from IPFS
 */
router.get("/:id/view", async (req, res) => {
  try {
    const fileId = +req.params.id;
    const file = await FileRecord.findByPk(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    const actor = req.user; // object from auth middleware
    const actorEmail = actor?.email || "anonymous";
    const role = actor?.role || "anonymous";

    // permission check
    let allowed = false;
    if (role === "user" && actor.id === file.userId) allowed = true;
    if (role === "keyholder" && actor.assignedUserId === file.userId) allowed = true;

    if (!allowed) {
      await AccessLog.create({ actorEmail, role, action: "view", fileId, ipAddress: req.ip, note: "denied" });
      return res.status(403).json({ message: "Access denied" });
    }

    // log success
    await AccessLog.create({ actorEmail, role, action: "view", fileId, ipAddress: req.ip, note: "success" });

    // optionally emit on-chain FileViewed event if configured
    if (process.env.PRIVATE_KEY && process.env.PROVIDER_URL && process.env.CONTRACT_ADDRESS) {
      try {
        const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const abi = ["function recordFileView(uint256 fileId, string memory cid) public"];
        const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);
        const tx = await contract.recordFileView(fileId, file.cid);
        // we won't wait for confirmation (avoid slowing response), but you can await if desired
        console.log("chain tx sent", tx.hash);
      } catch (err) {
        console.warn("chain record failed:", err.message || err);
      }
    }

    // Return metadata (CID); client may fetch via gateway or we can proxy
    return res.json({ cid: file.cid, filename: file.filename });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;



// POST /api/owner/share-key
// Body: { fileId: 123, keyholderEmail: "kh@example.com", symmetricKeyBase64: "..." }
// Authorization: owner JWT
import crypto from "crypto";

router.post("/owner/share-key", authMiddleware, async (req, res) => {
  try {
    // must be owner
    const owner = req.user;
    if (!owner || owner.role !== "user") return res.status(403).json({ message: "Only owners allowed" });

    const { fileId, keyholderEmail, symmetricKeyBase64 } = req.body;
    if (!fileId || !keyholderEmail || !symmetricKeyBase64) return res.status(400).json({ message: "Missing fields" });

    const file = await FileRecord.findByPk(fileId);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (file.userId !== owner.id) return res.status(403).json({ message: "Not the owner" });

    const kh = await Keyholder.findOne({ where: { email: keyholderEmail } });
    if (!kh || !kh.publicKey) return res.status(404).json({ message: "Keyholder or public key not found" });

    // decode symmetric key (base64) -> Buffer
    const symmetricKey = Buffer.from(symmetricKeyBase64, "base64");

    // Use RSA-OAEP (assumes kh.publicKey is RSA PEM). If you plan to use ECC (x25519), use libsodium libs.
    const encryptedBuf = crypto.publicEncrypt(
      {
        key: kh.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      symmetricKey
    );
    const encryptedBase64 = encryptedBuf.toString("base64");

    // store mapping in SharedKey table
    const shared = await SharedKey.create({
      fileId,
      keyholderId: kh.id,
      encryptedKey: encryptedBase64
    });

    // log action
    await AccessLog.create({
      actorEmail: owner.email,
      role: "user",
      action: "share_key",
      fileId,
      ipAddress: req.ip,
      note: `Shared key with keyholder ${kh.email}`
    });

    res.json({ success: true, sharedKeyId: shared.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Share failed", error: err.message });
  }
});

import { sendNotificationEmail } from "./mailer.js";
// after successful view log
try {
  const owner = await User.findByPk(file.userId);
  if (owner && owner.email) {
    const subject = `Your file was viewed by keyholder ${req.user.email}`;
    const html = `
      <p>Hi ${owner.email},</p>
      <p>Your keyholder <b>${req.user.email}</b> viewed file <b>${file.filename}</b> (id: ${file.id})</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>If you did not expect this, please review your account security.</p>
      <p><a href="${process.env.CLIENT_URL}/myfiles">View your files</a></p>
    `;
    await sendNotificationEmail(owner.email, subject, html);
  }
} catch (notifyErr) {
  console.warn("Failed to send view-notification email:", notifyErr);
}

