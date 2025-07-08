// app/api/test-email/route.ts
import { NextResponse } from 'next/server';
import { sendRFQEmails } from '../lib/mail';

export async function GET() {
  try {
    const to = ['johnsonfelix94@gmail.com'];
    const subject = 'Test Email from Next.js App';
    const message = `
      <h2>Hello Johnson,</h2>
      <p>This is a test email from your Next.js app using Nodemailer.</p>
    `;

    await sendRFQEmails(to, subject, message);

    return NextResponse.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
