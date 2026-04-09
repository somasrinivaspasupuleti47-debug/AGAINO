'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import {
  Users, UserCheck, ShoppingBag, ArrowLeft, Search,
  TrendingUp, Mail, Calendar, Package, Crown
} from 'lucide-react';

const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

interface DashboardUser {
  id: string;
  email: string;
  created_at: string;
}

interface Listing {
  _id: string;
  seller_id: string;
  status: string;
  price: number;
  title: string;
}

interface UserStats {
  id: string;
  email: string;
  created_at: string;
  totalListings: number;
  pendingListings: number;
  publishedListings: number;
  soldListings: number;
  totalEarnings: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'sellers' | 'sold'>('all');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || u.email !== ADMIN_EMAIL) {
        router.push('/login');
        return;
      }
      await fetchData();
    });
    return () => unsub();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all registered users from the dashboard table
    const { data: dashboardUsers } = await supabase
      .from('dashboard')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch all listings
    const { data: allListings } = await supabase
      .from('listings')
      .select('_id, seller_id, status, price, title');

    const usersList = (dashboardUsers as DashboardUser[]) || [];
    const listings = (allListings as Listing[]) || [];

    // Cross-reference: build stats per user
    const enriched: UserStats[] = usersList.map((u) => {
      const userListings = listings.filter((l) => l.seller_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        totalListings: userListings.length,
        pendingListings: userListings.filter((l) => l.status === 'pending').length,
        publishedListings: userListings.filter((l) => l.status === 'published').length,
        soldListings: userListings.filter((l) => l.status === 'sold').length,
        totalEarnings: userListings
          .filter((l) => l.status === 'sold')
          .reduce((sum, l) => sum + (l.price || 0), 0),
      };
    });

    setUsers(enriched);
    setLoading(false);
  };

  /* ── Derived stats ── */
  const totalSignups = users.length;
  const activeSellers = users.filter((u) => u.totalListings > 0).length;
  const successfulSellers = users.filter((u) => u.soldListings > 0).length;
  const totalRevenue = users.reduce((s, u) => s + u.totalEarnings, 0);

  const stats = [
    { label: 'Total Signups', value: totalSignups, icon: <Users size={20} />, color: 'from-violet-500 to-purple-600' },
    { label: 'Active Sellers', value: activeSellers, icon: <UserCheck size={20} />, color: 'from-emerald-500 to-teal-600' },
    { label: 'Successful Sellers', value: successfulSellers, icon: <Crown size={20} />, color: 'from-amber-500 to-yellow-600' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'from-pink-500 to-rose-600' },
  ];

  /* ── Filtering ── */
  const filtered = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase());
    if (filter === 'sellers') return matchesSearch && u.totalListings > 0;
    if (filter === 'sold') return matchesSearch && u.soldListings > 0;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="font-bold text-lg leading-none">Users Report</p>
              <p className="text-xs text-slate-400 mt-0.5">All registered platform users</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* ── Stats ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-5`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-lg`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Search & Filters ── */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Users <span className="text-white ml-1">({filtered.length})</span>
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email..."
                  className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 transition"
                />
              </div>
              <div className="flex rounded-xl border border-white/10 overflow-hidden text-xs font-semibold">
                {(['all', 'sellers', 'sold'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 capitalize transition ${
                      filter === f
                        ? 'bg-orange-500 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f === 'sold' ? 'Has Sales' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
              <Users size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 font-semibold">No users found</p>
              <p className="text-slate-600 text-sm mt-1">Try changing the search or filter</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur">
              {/* Table Head */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-white/10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <span>User</span>
                <span>Joined</span>
                <span>Listings</span>
                <span>Pending</span>
                <span>Sold</span>
                <span>Earnings</span>
              </div>

              {/* Table Rows */}
              {filtered.map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm font-bold shrink-0 shadow-lg">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                        <Mail size={12} className="text-slate-500 shrink-0" />
                        {user.email}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        ID: {user.id.substring(0, 12)}...
                      </p>
                    </div>
                  </div>

                  {/* Joined */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={12} className="text-slate-600 shrink-0" />
                    {new Date(user.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </div>

                  {/* Total Listings */}
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">{user.totalListings}</span>
                  </div>

                  {/* Pending */}
                  <span className={`text-sm font-bold ${user.pendingListings > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                    {user.pendingListings}
                  </span>

                  {/* Sold */}
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={12} className={user.soldListings > 0 ? 'text-emerald-400' : 'text-slate-700'} />
                    <span className={`text-sm font-bold ${user.soldListings > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {user.soldListings}
                    </span>
                  </div>

                  {/* Earnings */}
                  <p className={`text-sm font-bold ${user.totalEarnings > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                    ₹{user.totalEarnings.toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
