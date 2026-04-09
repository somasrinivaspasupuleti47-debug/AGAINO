'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
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
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      
      if (!userCredential.user) {
        throw new Error('User already exists. Please login.');
      }

      // Send Firebase Email Verification link
      await sendEmailVerification(userCredential.user);

// Save user details to Supabase 'dashboard' table
      const { error: dbError } = await supabase.from('dashboard').insert({
        id: userCredential.user.uid,
        email: form.email,
        created_at: new Date().toISOString(),
      });

      // Also insert into dedicated 'users' table for admin reports
      const { error: usersError } = await supabase.from('users').insert({
        id: userCredential.user.uid,
        email: form.email,
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.warn('Failed to save to Supabase dashboard:', dbError);
      }
      if (usersError) {
        console.warn('Failed to save to Supabase users table:', usersError);
      }

      alert('Registration successful! Please check your email to verify your account.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-2">
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