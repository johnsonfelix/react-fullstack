// app/api/send-invitation/route.ts

import { NextResponse } from 'next/server';
import { sendEmail } from '../lib/mail';
import { generateInvitationToken } from '@/app/lib/token';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate an invitation token
    const token = generateInvitationToken(email, '24h');
    const invitationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/supplier-verify?token=${token}`;
    
    const subject = 'Invitation to Register as a Supplier';
    // Use &apos; for the apostrophe in the HTML string to avoid syntax errors
    const message = `
      <h2>You&apos;re Invited!</h2>
      <p>Please click the button below to begin your registration. This link is valid for 24 hours.</p>
      <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">Verify Your Email</a>
      <p>If you did not request this invitation, please disregard this email.</p>
    `;

    await sendEmail(email, subject, message);

    return NextResponse.json({ message: 'Invitation sent successfully' });

  } catch (error: any) {
    // Log the full error to the console for detailed debugging
    console.error('[SEND_INVITATION_ERROR]', error);

    // Return a more informative error message in the response
    return NextResponse.json(
      { error: 'Failed to send invitation.', details: error.message },
      { status: 500 }
    );
  }
}
