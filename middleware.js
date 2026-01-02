import jwt from "jsonwebtoken";
import { AccessLog } from "./db.js";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Accepts either user or keyholder JWT; attaches req.user (role,user...) or req.keyholder
export async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // attach as generic req.user
    req.user = payload; // payload.role determines whether user/keyholder
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Middleware: keyholders may only use GET on file routes (read-only)
export function keyholderOnlyView(req, res, next) {
  if (req.user && req.user.role === "keyholder") {
    if (req.method !== "GET") {
      // log attempt
      AccessLog.create({
        actorEmail: req.user.email,
        role: "keyholder",
        action: "attempt_denied",
        note: "keyholder tried non-GET file action",
        ipAddress: req.ip,
      });
      return res.status(403).json({ message: "Keyholders have read-only access." });
    }
  }
  next();
}
