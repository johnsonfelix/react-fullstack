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
export default async function SupplierRegistrationPage(props: any) {
  // Get searchParams safely from props and coerce into our expected shape
  const searchParams = (props?.searchParams ?? {}) as { token?: string | string[] | undefined };

  // Next might pass token as string or string[]
  const rawToken = searchParams?.token;
  const tokenStr = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  // If token might come as "Bearer <token>", use split() to extract token
  const cleanedToken = tokenStr?.includes(" ") ? tokenStr.split(" ").pop() ?? undefined : tokenStr;

  // Verify token on server
  const verifiedEmail = getVerifiedEmailFromToken(cleanedToken ?? undefined);

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
