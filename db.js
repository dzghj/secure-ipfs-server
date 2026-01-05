import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

//export const sequelize = new Sequelize(process.env.DATABASE_URL, {// for test-db.js
 const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
});

export const User = sequelize.define("User", {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  keyholderEmail: { type: DataTypes.STRING, allowNull: true },
});

export const Keyholder = sequelize.define("Keyholder", {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: true }, // set when keyholder chooses password
  assignedUserId: { type: DataTypes.INTEGER, allowNull: true },
  canAccessFiles: { type: DataTypes.BOOLEAN, defaultValue: true },
});

// in server/db.js (after Keyholder model definition)
Keyholder.publicKey = sequelize.define ? Keyholder.publicKey : Keyholder; // noop if older style; below we add attribute properly

// Better: re-define Keyholder with publicKey, or use migration. Example:
Keyholder.init({
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: true },
  assignedUserId: { type: DataTypes.INTEGER, allowNull: true },
  canAccessFiles: { type: DataTypes.BOOLEAN, defaultValue: true },
  publicKey: { type: DataTypes.TEXT, allowNull: true }   // <-- new
}, { sequelize, modelName: 'Keyholder' });

// New model: SharedKey
export const SharedKey = sequelize.define("SharedKey", {
  fileId: { type: DataTypes.INTEGER, allowNull: false },
  keyholderId: { type: DataTypes.INTEGER, allowNull: false },
  encryptedKey: { type: DataTypes.TEXT, allowNull: false }, // base64
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
});

export const FileRecord = sequelize.define("FileRecord", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  cid: { type: DataTypes.STRING, allowNull: false },
  sha256Hash: { type: DataTypes.STRING, allowNull: true },
  uploadedAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

export const AccessLog = sequelize.define("AccessLog", {
  actorEmail: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING }, // "user" | "keyholder" | "system"
  action: { type: DataTypes.STRING }, // "view","attempt_denied","integrity_alert",...
  fileId: { type: DataTypes.INTEGER, allowNull: true },
  ipAddress: { type: DataTypes.STRING, allowNull: true },
  note: { type: DataTypes.TEXT, allowNull: true },
  timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

await sequelize.sync();
console.log("DB synced");
export default sequelize;
