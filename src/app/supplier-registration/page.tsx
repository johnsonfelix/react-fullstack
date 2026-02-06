import jwt from 'jsonwebtoken';
import MultiStepForm from "@/app/components/supplier-registration/multi-step-form";
import React from "react";

// Define decoded token shape
interface DecodedToken {
  email: string;
  iat: number;
  exp: number;
}

// Helper to verify JWT on the server
function getVerifiedEmailFromToken(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "") as DecodedToken;
    return decoded.email ?? null;
  } catch (err) {
    console.error("Failed to verify registration token:", err);
    return null;
  }
}

/**
 * Exported page component.
 * Use `props: any` to avoid mismatches with Next's generated PageProps type.
 * We then coerce/extract `searchParams` to the shape we expect.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SupplierRegistrationPage(props: any) {
  // 1. Check for active session first
  const session = await getServerSession(authOptions);
  let verifiedEmail: string | null = null;

  if (session?.user?.email) {
    verifiedEmail = session.user.email;
  } else {
    // 2. Fallback to token validation if no session
    const searchParams = (props?.searchParams ?? {}) as { token?: string | string[] | undefined };
    const rawToken = searchParams?.token;
    const tokenStr = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const cleanedToken = tokenStr?.includes(" ") ? tokenStr.split(" ").pop() ?? undefined : tokenStr;
    verifiedEmail = getVerifiedEmailFromToken(cleanedToken ?? undefined);
  }

  if (!verifiedEmail) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid or Expired Link</h1>
        <p className="mt-4">The registration link is either invalid or has expired. Please go through the verification process again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Supplier Registration</h1>
      <MultiStepForm verifiedEmail={verifiedEmail} />
    </div>
  );
}
