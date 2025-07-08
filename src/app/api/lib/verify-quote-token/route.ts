import { NextRequest, NextResponse } from 'next/server';
import { verifyQuoteToken } from '../jwt';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token missing' }, { status: 400 });
  }

  try {
    const data = verifyQuoteToken(token);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
