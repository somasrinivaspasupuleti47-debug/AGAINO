'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const { confirmPasswordReset } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      // In firebase, the token is called 'oobCode' in the URL usually, so 'token' from our params is used as oobCode
      await confirmPasswordReset(auth, token, password);
      router.push('/login?reset=success');
    } catch (err: any) {
      setError(err.message || 'Reset failed. Link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-5xl text-center mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-center mb-1">Reset Password</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Enter your new password below</p>
        {error && <p className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</p>}
        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            type="password" placeholder="New password (min 8 chars)"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
          />
          <input
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            type="password" placeholder="Confirm new password"
            value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
          />
          <button disabled={loading} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-60">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-orange-500 font-medium">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>;
}
