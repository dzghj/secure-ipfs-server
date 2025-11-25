import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data.sqlite",
  logging: false,
});

// Users
export const User = sequelize.define("User", {
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
});

// Files
export const FileRecord = sequelize.define("FileRecord", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  cid: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "pending" },
  timestamp: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
});

await sequelize.sync();
export default sequelize;
