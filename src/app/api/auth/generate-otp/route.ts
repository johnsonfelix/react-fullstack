// app/api/auth/generate-otp/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendEmail } from '../../lib/mail';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in the database
    await prisma.otp.upsert({
      where: { email },
      update: { otp, expiresAt },
      create: { email, otp, expiresAt },
    });

    // Send OTP to user's email
    const subject = 'Your One-Time Password (OTP)';
    const message = `
      <h2>Supplier Registration OTP</h2>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `;

    await sendEmail(email, subject, message);

    return NextResponse.json({ message: 'OTP sent to your email address.' });
  } catch (error) {
    console.error('Error generating OTP:', error);
    return NextResponse.json({ error: 'Failed to generate OTP.' }, { status: 500 });
  }
}
