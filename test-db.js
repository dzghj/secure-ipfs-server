import { sequelize, User } from "./db.js";

import bcrypt from "bcryptjs";
import crypto from "crypto";
//import transporter from "./mailer.js"; // your nodemailer transporter
import { transporter } from "./mailer.js"; // notice the curly braces

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
  
  //testLogin();
  /**
 * TEST: Forgot Password
 * - find user
 * - generate reset token
 * - store token + expiry
 */
  


   
async function testForgotPassword() {
    try {
      console.log("🔌 Connecting to database...");
      await sequelize.authenticate();
      console.log("✅ DB connected");
  
      // log current user & role
      const [roleInfo] = await sequelize.query(`
        SELECT current_user, current_setting('role', true) AS role
      `);
      console.log(roleInfo[0]);
  
      const email = "deng_zg@hotmail.com";
  
      console.log("🔍 Fetching user...");
      let user = await User.findOne({ where: { email } });
  
      if (!user) {
        console.log("❌ User not found");
        return;
      }
  
      console.log("🧾 BEFORE UPDATE");
      console.log({
        id: user.id,
        resetToken: user.resetToken,
        resetTokenExpiry: user.resetTokenExpiry,
      });
  
      // generate new reset token and expiry
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes from now
  
      // assign in memory
      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
  
      console.log("✏️ Assigning new values (in memory)");
      console.log({ resetToken, resetTokenExpiry: new Date(resetTokenExpiry).toISOString() });
  
      // save user
      await user.save();
      console.log("💾 user.save() called");
  
      // reload from DB via Sequelize
      await user.reload();
      console.log("🔁 AFTER RELOAD FROM DB (Sequelize)");
      console.log({
        resetToken: user.resetToken,
        resetTokenExpiry: user.resetTokenExpiry,
      });
  
      // direct raw DB query to confirm persistence
      const [rows] = await sequelize.query(
        `SELECT "resetToken", "resetTokenExpiry" FROM public."Users" WHERE email = :email`,
        { replacements: { email } }
      );
      console.log("🧪 RAW DB QUERY RESULT");
      console.log(rows[0]);
  
      if (rows[0]?.resetToken === resetToken) {
        console.log("✅ TOKEN CONFIRMED SAVED IN DATABASE");
        console.log("🔑 TOKEN:", rows[0].resetToken);
        console.log("⏰ Expiry:", new Date(Number(rows[0].resetTokenExpiry)).toISOString());
      } else {
        console.error("❌ TOKEN WAS NOT SAVED CORRECTLY");
      }
  
    } catch (err) {
      console.error("❌ Forgot password test failed:", err);
    } finally {
      await sequelize.close();
      console.log("🔒 DB connection closed");
    }
  }
  
  
  /**
   * TEST: Reset Password
   * - verify token
   * - hash new password
   * - clear reset token
   */
   async function testResetPassword() {
    try {
      console.log("🔌 Connecting to database...");
      await sequelize.authenticate();
      console.log("✅ DB connected");
  
      // 🔑 Token generated from forgot password test
      const token = "e8d767ec8b103409401a4e26aa44fb8120c25516bba322075b67ec60cdb66096";
      const newPassword = "newpassword123";
  
      console.log("🔍 Looking for user with reset token...");
      const user = await User.findOne({ where: { resetToken: token } });
  
      if (!user) {
        console.log("❌ Invalid reset token");
        return;
      }
  
      console.log("🕒 Checking token expiry...");
      if (Number(user.resetTokenExpiry) < Date.now()) {
        console.log("❌ Reset token expired");
        return;
      }
  
      console.log("✏️ Resetting password...");
      const hash = bcrypt.hashSync(newPassword, 8);
  
      user.passwordHash = hash;           // ✅ correct field
      // Keep token until after verification, if needed for logs
      const oldToken = user.resetToken;
  
      await user.save();
      console.log("✅ Password reset successful");
  
      // Verify password
      const ok = bcrypt.compareSync(newPassword, user.passwordHash);
      console.log("🔐 New password valid?", ok);
  
      // Optionally clear resetToken after verification
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();
      console.log("🗝️ Reset token cleared:", oldToken);
  
    } catch (err) {
      console.error("❌ Reset password test failed:", err);
    } finally {
      await sequelize.close();
      console.log("🔒 DB connection closed");
    }
  }
  /* =========================
     RUN ONE AT A TIME
     ========================= */
  
   //testForgotPassword();
   //testResetPassword();
   async function testEmail() {
    try {
      const testEmail = "deng_zg@hotmail.com"; // recipient
      const resetToken = "Token"; // dummy token
      const clientUrl = process.env.CLIENT_URL.replace(/\/$/, ""); // remove trailing slash
      const resetLink = `${clientUrl}/reset-password/${resetToken}`;
  
      console.log("📧 Sending test email...");
  
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER, // sender
        to: testEmail,                // recipient
        subject: "Test Password Reset Email",
        html: `
          <p>This is a test email for password reset functionality.</p>
          <p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>
        `,
      });
  
      console.log("✅ Test email sent!");
      console.log("Message ID:", info.messageId);
      console.log("Preview URL (if using ethereal):", info.previewURL || "N/A");
  
    } catch (err) {
      console.error("❌ Failed to send test email:", err);
    }
  }
  
  // run the function
  testEmail();