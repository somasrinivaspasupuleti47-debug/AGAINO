'use client';
import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">🔑</div>
        <h1 className="text-2xl font-bold mb-1">Forgot Password</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your email and we'll send a reset link</p>

        {sent ? (
          <div className="bg-green-50 text-green-600 p-4 rounded-xl">
            <p className="font-medium">Reset link sent!</p>
            <p className="text-sm mt-1">Check your email inbox and follow the link to reset your password.</p>
            <Link href="/login" className="mt-4 inline-block text-orange-500 font-medium text-sm">Back to Login</Link>
          </div>
        ) : (
          <>
            {error && <p className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</p>}
            <form onSubmit={submit} className="space-y-4 text-left">
              <input
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                type="email" placeholder="Your email address"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
              <button disabled={loading} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-4">
              <Link href="/login" className="text-orange-500 font-medium">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
