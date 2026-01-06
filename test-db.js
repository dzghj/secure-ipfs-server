import { sequelize, User } from "./db.js";

import bcrypt from "bcryptjs";

async function createTestUser() {
  const hash = bcrypt.hashSync("123456", 8);

  const user = await User.create({
    email: "test@test.com",
    passwordHash: hash,
  });

  console.log("✅ User created:", user.id, user.email);
}


async function testDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection OK");

    await sequelize.sync();
    console.log("✅ Tables synced");

    process.exit(0);
  } catch (err) {
    console.error("❌ DB error:", err);
    process.exit(1);
  }
}

async function findUser() {
    const user = await User.findOne({
      where: { email: "test@test.com" }
    });
  
    if (!user) {
      console.log("❌ User not found");
    } else {
      console.log("✅ User found:", user.email);
    }
  }

  async function testPassword() {
    const user = await User.findOne({
      where: { email: "test@test.com" }
    });
  
    const ok = bcrypt.compareSync("123456", user.passwordHash);
    console.log("Password valid?", ok);
  }
//testDB();
//createTestUser();
//findUser();
//testPassword();
async function testLogin() {
    try {
      console.log("🔌 Connecting to database...");
      await sequelize.authenticate();
      console.log("✅ DB connected");
  
      const email = "test@test.com";       // CHANGE to existing email
      const password = "123456";         // CHANGE to test password
  
      console.log("🔍 Looking for user:", email);
  
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        console.log("❌ User not found");
        return;
      }
  
      console.log("✅ User found:", user.email);
      console.log("🔑 Stored hash:", user.passwordHash);
  
      const valid = bcrypt.compareSync(password, user.passwordHash);
  
      console.log("🔐 Password valid?", valid);
  
    } catch (err) {
      console.error("❌ Error:", err);
    } finally {
      await sequelize.close();
      console.log("🔒 DB connection closed");
    }
  }
  
  testLogin();