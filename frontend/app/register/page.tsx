'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/register', {
        displayName: form.displayName,
        email: form.email,
        password: form.password
      });

      router.push(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-2 text-orange-500">
          Create Account
        </h1>

        <p className="text-gray-400 text-center text-sm mb-6">
          Sign up to continue
        </p>

        {error && (
          <p className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={form.displayName}
            onChange={(e) =>
              setForm({ ...form, displayName: e.target.value })
            }
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />

          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-500 font-medium">
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}