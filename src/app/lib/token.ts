// lib/token.ts

import jwt, { SignOptions } from 'jsonwebtoken';

// Define an interface for the payload for better type-checking
interface InvitationPayload {
  email: string;
}

// Ensure JWT_SECRET is not undefined
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

/**
 * Generates a JWT for email invitation.
 * @param email - The recipient's email address.
 * @param expiresIn - The token's time to live (e.g., '24h', '1d', '600s').
 * @returns The generated token.
 */
export function generateInvitationToken(email: string, expiresIn: string = '24h'): string {
  const payload: InvitationPayload = { email };

  // This is the key change: assert the entire options object as SignOptions.
  // This tells TypeScript to trust that the structure, including the `expiresIn` string, is valid.
  const options = {
    expiresIn,
  } as SignOptions;

  const token = jwt.sign(payload, JWT_SECRET, options);

  return token;
}

/**
 * Verifies an invitation token.
 * @param token - The JWT to verify.
 * @returns The decoded payload if the token is valid, otherwise null.
 */
export function verifyInvitationToken(token: string): InvitationPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as InvitationPayload & { iat: number; exp: number };
    return { email: decoded.email };
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}
