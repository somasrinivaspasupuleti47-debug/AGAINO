'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShoppingBag, Tag } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      const userEmail = userCredential.user.email;

      // Admin redirection
      if (userEmail === 'somasrinivaspasupuleti47@gmail.com') {
        router.push('/admin/dashboard');
      } else {
        // Standard user redirection based on role
        router.push(role === 'seller' ? '/seller/dashboard' : '/marketplace');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1 text-orange-500">Welcome Back</h1>
        <p className="text-gray-400 text-center text-sm mb-6">Login to your AGAINO account</p>

        {/* Role Selector */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600 mb-3 text-center">I am logging in as a</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="role-buyer"
              onClick={() => setRole('buyer')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                role === 'buyer'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-orange-300 hover:text-orange-400'
              }`}
            >
              <ShoppingBag size={24} />
              <span className="font-semibold text-sm">Buyer</span>
              <span className="text-xs text-center leading-tight opacity-70">Browse &amp; purchase listings</span>
            </button>

            <button
              type="button"
              id="role-seller"
              onClick={() => setRole('seller')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                role === 'seller'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-orange-300 hover:text-orange-400'
              }`}
            >
              <Tag size={24} />
              <span className="font-semibold text-sm">Seller</span>
              <span className="text-xs text-center leading-tight opacity-70">List &amp; sell your items</span>
            </button>
          </div>
        </div>

        {error && <p className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <input
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            required
          />
          <input
            className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            required
          />
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-orange-500">Forgot password?</Link>
          </div>
          <button
            disabled={loading}
            className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg hover:bg-orange-600 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Logging in...' : `Login as ${role === 'buyer' ? 'Buyer' : 'Seller'}`}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link href="/register" className="text-orange-500 font-medium">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

