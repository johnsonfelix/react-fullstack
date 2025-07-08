export function generateRFQEmail({
  title,
  closeDate,
  closeTime,
  noteToSupplier,
  quoteLink,
  register
  
}: {
  title: string;
  closeDate: string;
  closeTime: string;
  noteToSupplier: string;
  quoteLink: string;
  register:string;
}) {
  const rfqDetailsLink = `${quoteLink}?view=details`;

  return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 24px; border-radius: 8px;">
      <h2 style="color: #0070f3;">📄 New Request for Quotation (RFQ)</h2>
      <p>Dear Supplier,</p>
      <p>You have been invited to respond to the following RFQ:</p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0;"><strong>📌 Title:</strong></td>
          <td>${title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>📅 Close Date:</strong></td>
          <td>${closeDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>⏰ Close Time:</strong></td>
          <td>${closeTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: top;"><strong>📝 Notes:</strong></td>
          <td>${noteToSupplier || 'None'}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${quoteLink}" style="display: inline-block; background-color: #0070f3; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; margin-right: 10px;">
          Respond without Register
        </a>
        <a href="${register}" style="display: inline-block; background-color: #e2e8f0; color: #333; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold;">
          Join Our Suppliers (Verified)
        </a>
      </div>

      <p>We look forward to your response.</p>
      <p>Thank you,<br/><strong>Your Procurement Team</strong></p>
    </div>
  `;
}
