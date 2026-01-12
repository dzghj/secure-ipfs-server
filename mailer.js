// server/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// send a simple notification email
export async function sendNotificationEmail(toEmail, subject, html) {
  const mail = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject,
    html
  };
  return transporter.sendMail(mail);
}
