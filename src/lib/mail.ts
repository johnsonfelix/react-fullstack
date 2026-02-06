
import nodemailer from 'nodemailer';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendApprovalEmail(
  to: string,
  approverName: string,
  rfpTitle: string,
  approvalLink: string,
  rejectLink: string
) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Approval Required</h2>
      <p>Hello ${approverName},</p>
      <p>You have been requested to approve the following RFP:</p>
      <p><strong>${rfpTitle}</strong></p>
      <p>Please review the details and provide your decision.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${approvalLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Review & Approve</a>
      </div>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        If the button above doesn't work, verify here: ${approvalLink}
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `Approval Required: ${rfpTitle}`,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    // For local dev without real SMTP, we might want to log the preview URL if using Ethereal
    // or just log the link manually to console for convenience
    console.log("\n--- APPROVAL LINK (DEBUG) ---\n", approvalLink, "\n-----------------------------\n");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    // Fallback for demo: always log the link so the user can test even if email fails
    console.log("\n--- EMAIL FAILED BUT HERE IS THE LINK (DEBUG) ---\n", approvalLink, "\n-------------------------------------------------\n");
    return false;
  }
}

export async function sendSupplierInvitation(
  to: string,
  supplierName: string,
  rfpTitle: string,
  link: string
) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>RFP Invitation</h2>
      <p>Hello ${supplierName},</p>
      <p>You have been invited to participate in the following RFP:</p>
      <p><strong>${rfpTitle}</strong></p>
      <p>We believe your company is a great fit for this opportunity. Please review the details and submit your proposal.</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">View RFP</a>
      </div>

      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        If the button above doesn't work, click here: ${link}
      </p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `Invitation to Bid: ${rfpTitle}`,
      html,
    });
    console.log("Supplier Invitation sent: %s", info.messageId);
    console.log("\n--- SUPPLIER LINK (DEBUG) ---\n", link, "\n-----------------------------\n");
    return true;
  } catch (error) {
    console.error("Error sending supplier email:", error);
    console.log("\n--- SUPPLIER EMAIL FAILED (DEBUG) ---\n", link, "\n-------------------------------------\n");
    return false;
  }
}

export async function sendAccountRecoveryEmail(
  to: string,
  subject: string,
  html: string,
  debugInfo?: string // Optional debug info (like temp password) to log
) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log("Recovery email sent: %s", info.messageId);
    if (debugInfo) {
      console.log("\n--- RECOVERY CREDENTIALS (DEBUG) ---\n", debugInfo, "\n------------------------------------\n");
    }
    return true;
  } catch (error) {
    console.error("Error sending recovery email:", error);
    // Fallback logging for dev
    if (debugInfo) {
      console.log("\n--- RECOVERY EMAIL FAILED (DEBUG SUBMITTED) ---\n", debugInfo, "\n-----------------------------------------------\n");
    }
    return false;
  }
}
