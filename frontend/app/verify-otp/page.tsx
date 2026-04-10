'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/verify-otp', {
        email,
        otp: otpCode
      });

      alert('Verification successful! You can now login.');
      router.push('/login?verified=true');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-gray-400 text-sm mb-6">
          We've sent a 6-digit code to <span className="text-gray-700 font-medium">{email}</span>
        </p>

        {error && (
          <p className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-6">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-8">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                autoComplete="one-time-code"
                value={digit}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-orange-500 focus:outline-none transition-all"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-60 transition-colors shadow-lg shadow-orange-500/20"
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Didn't receive the code?{' '}
          <button 
            type="button"
            className="text-orange-500 font-medium hover:underline"
            onClick={() => alert('Code resent! (Feature not yet connected to backend)')}
          >
            Resend
          </button>
        </p>
        
        <Link href="/register" className="mt-4 inline-block text-xs text-gray-400 hover:text-orange-500">
          Back to signup
        </Link>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-orange-50">Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
