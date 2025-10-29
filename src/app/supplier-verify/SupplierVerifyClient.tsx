// app/supplier-registration/verify/SupplierVerifyClient.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

enum VerificationStatus {
  VerifyingToken,
  TokenInvalid,
  Ready,
  OtpSent,
}

export default function SupplierVerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<VerificationStatus>(VerificationStatus.VerifyingToken);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No invitation token found. The link may be incomplete.');
      setStatus(VerificationStatus.TokenInvalid);
      return;
    }

    const verifyToken = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify invitation.');
        setEmail(data.email || '');
        setStatus(VerificationStatus.Ready);
      } catch (err: any) {
        setError(err.message || 'Something went wrong while verifying the token.');
        setStatus(VerificationStatus.TokenInvalid);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const startCooldown = (seconds = 30) => setCooldown(seconds);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/generate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setMessage(data.message || 'OTP sent.');
      setStatus(VerificationStatus.OtpSent);
      startCooldown(30);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify OTP.');

      const { registrationToken } = data;
      if (!registrationToken) throw new Error('Verification succeeded, but no registration token provided.');
      router.push(`/supplier-registration?token=${encodeURIComponent(registrationToken)}`);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
      setStatus(VerificationStatus.OtpSent);
    } finally {
      setIsLoading(false);
    }
  };

  const renderReady = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Confirm your email</label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            className="w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="mt-1 text-xs text-gray-500">We'll send a one-time code to this address.</p>
        </div>
        <button
          type="submit"
          disabled={isLoading || !email}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white ${isLoading || !email ? 'opacity-60 cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
            </svg>
          ) : (
            <><Mail className="h-4 w-4" /> Send</>
          )}
        </button>
      </div>
    </form>
  );

  const renderOtpSent = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      {message && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <p className="text-sm text-gray-700">An OTP has been sent to <strong>{email}</strong>. Enter it below to continue.</p>

      <div className="flex gap-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          required
          maxLength={6}
          placeholder="Enter 6-digit code"
          className="flex-1 rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg tracking-[0.2em] text-center"
        />
        <button
          type="submit"
          disabled={isLoading || otp.length < 6}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white ${isLoading || otp.length < 6 ? 'opacity-60 cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => { if (!isLoading && cooldown === 0) handleSendOtp(); }}
          disabled={isLoading || cooldown > 0}
          className={`inline-flex items-center gap-2 text-sm ${cooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:underline'}`}
        >
          <RefreshCw className="h-4 w-4" />
          {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend OTP'}
        </button>

        <button
          type="button"
          onClick={() => { setStatus(VerificationStatus.Ready); setOtp(''); setMessage(''); setError(''); }}
          className="text-sm text-gray-600 hover:underline"
        >
          Change email
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Supplier Verification</h1>
            <p className="text-sm text-gray-500">Securely verify your email to continue registration</p>
          </div>
        </div>

        <div className="mt-2">
          {status === VerificationStatus.VerifyingToken && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
              </svg>
              <span>Verifying your invitation...</span>
            </div>
          )}

          {status === VerificationStatus.TokenInvalid && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4" />
                <div>{error || 'Invalid or expired token.'}</div>
              </div>
            </div>
          )}

          {status === VerificationStatus.Ready && renderReady()}

          {status === VerificationStatus.OtpSent && renderOtpSent()}

          {error && status !== VerificationStatus.TokenInvalid && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4" />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-400">
          By continuing you agree to our terms and privacy policy.
        </div>
      </motion.div>
    </div>
  );
}
