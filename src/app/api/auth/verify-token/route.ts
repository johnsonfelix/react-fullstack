// app/api/auth/verify-token/route.ts

import { NextResponse } from 'next/server';
import { verifyInvitationToken } from '@/app/lib/token';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const payload = verifyInvitationToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired invitation token.' }, { status: 401 });
    }

    // Token is valid, return the email from the payload
    return NextResponse.json({ email: payload.email });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({ error: 'Failed to verify token.' }, { status: 500 });
  }
}
