// lib/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXT_AUTH_SECRET || 'your-very-secure-secret';

export function generateQuoteToken(data: { rfqId: string; supplierId: string }) {
  return jwt.sign(data, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyQuoteToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { rfqId: string; supplierId: string };
}
