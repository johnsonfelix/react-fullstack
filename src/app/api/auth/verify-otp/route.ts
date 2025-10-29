// app/api/auth/verify-otp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
// Import your centralized email function
import { sendEmail } from '../../lib/mail';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // --- OTP Verification Logic (remains the same) ---
    const record = await prisma.otp.findUnique({ where: { email } });

    if (!record) {
      return NextResponse.json({ error: 'No OTP request found for this email.' }, { status: 400 });
    }

    if (record.expiresAt < new Date() || record.otp !== otp) {
      return NextResponse.json({ error: 'OTP is invalid or has expired.' }, { status: 400 });
    }

    await prisma.otp.delete({ where: { email } });

    // --- JWT and Link Generation (remains the same) ---
    const registrationToken = jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const registrationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/supplier-registration?token=${registrationToken}`;

    // --- MODIFICATION: Use your sendEmail function ---
    const emailSubject = 'Complete Your Supplier Registration';
    const emailHtml = `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h2>Welcome!</h2>
        <p>Your email has been successfully verified.</p>
        <p>Please click the button below to complete your registration. This link will expire in 7 Days.</p>
        <a href="${registrationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
          Complete Registration
        </a>
      </div>
    `;

    // Send the email in the background using your centralized function
    sendEmail(email, emailSubject, emailHtml).catch(err => {
      // If the email fails, log the error. The API response to the user is not affected.
      console.error("Caught an error from sendEmail helper:", err);
    });

    // --- API Response (remains the same) ---
    // Immediately return the token to the frontend for redirection.
    return NextResponse.json({ 
      message: 'Email verified successfully.', 
      registrationToken: registrationToken
    });

  } catch (error) {
    console.error('Error during the main OTP verification process:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
