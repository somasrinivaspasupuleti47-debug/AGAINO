'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShoppingBag, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

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
      const { data } = await api.post('/auth/login', {
        email: form.email,
        password: form.password
      });

      // Save tokens in localStorage for getSession() to use
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Admin redirection
      if (form.email === 'somasrinivaspasupuleti47@gmail.com') {
        router.push('/admin/dashboard');
      } else {
        // Standard user redirection based on role
        router.push(role === 'seller' ? '/seller/dashboard' : '/marketplace');
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(
          <div className="flex flex-col gap-2">
            <span>{err.response?.data?.message || 'Email not verified'}</span>
            <Link href={`/verify-otp?email=${encodeURIComponent(form.email)}`} className="text-orange-600 font-bold underline">
              Verify your email now
            </Link>
          </div>
        );
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed');
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50">
      {/* ── Advanced Animated Background ── */}
      <div className="absolute inset-0 z-0">
        {/* Animated Mesh Gradients */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-orange-300/30 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-red-400/20 blur-[120px]"
        />

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5 + 0.2
            }}
            animate={{
              y: [null, "-20%", "20%"],
              x: [null, "10%", "-10%"],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute w-2 h-2 bg-orange-500/20 rounded-full blur-sm"
          />
        ))}
      </div>

      {/* ── Login Card ── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 p-8 w-full max-w-md mx-4"
      >
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
      </motion.div>
    </div>
  );
}

