// app/api/auth/verify-otp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // 1. Find the OTP record in the database
    const record = await prisma.otp.findUnique({
      where: { email },
    });

    if (!record) {
      return NextResponse.json({ error: 'No OTP request found for this email.' }, { status: 400 });
    }

    // 2. Validate the OTP
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
    }

    // 3. OTP is valid, so delete it to prevent reuse
    await prisma.otp.delete({
      where: { email },
    });

    // 4. Create a short-lived JWT for the registration process
    // It uses the JWT_SECRET from your .env.local file
    const registrationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } // The token will be valid for 1 hour
    );

    // 5. Create the secure registration link with the token
    const registrationLink = `${process.env.NEXT_PUBLIC_APP_URL}/supplier-registration?token=${registrationToken}`;

    // 6. Configure Nodemailer to send the email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // `true` for port 465, `false` for others
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 7. Send the email with the secure link
    await transporter.sendMail({
      from: `"Your App Name" <no-reply@yourapp.com>`,
      to: email,
      subject: 'Complete Your Supplier Registration',
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h2>Welcome!</h2>
          <p>Your email has been successfully verified.</p>
          <p>Please click the button below to complete your registration. This link will expire in 1 hour.</p>
          <a href="${registrationLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
            Complete Registration
          </a>
        </div>
      `,
    });

    // 8. Send a success response back to the frontend
    return NextResponse.json({ message: 'Email verified. A registration link has been sent to your email address.' });

  } catch (error) {
    console.error('Error in OTP verification and email sending process:', error);
    // Provide a generic error to the client for security
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
