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