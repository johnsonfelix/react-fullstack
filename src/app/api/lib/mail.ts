// lib/email.ts
import nodemailer from 'nodemailer';

export async function sendRFQEmails(recipients: string[], subject: string, message: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail
      pass: process.env.EMAIL_PASS, // App Password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipients.join(','), // All supplier emails
    subject,
    html: message,
  };

  await transporter.sendMail(mailOptions);
}
