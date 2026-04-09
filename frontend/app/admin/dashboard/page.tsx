'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck, Package, CheckCircle, ShoppingBag, Trash2,
  Eye, Search, Filter, LogOut, TrendingUp, Users, Tag,
  AlertTriangle, X, ChevronDown, Clock,
} from 'lucide-react';

const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

interface Listing {
  _id: string;
  id: string;
  title: string;
  price: number;
  condition: string;
  status: string;
  category: string;
  subcategory: string;
  seller_id: string;
  seller_phone: string;
  location: { city: string; region: string };
  images: { thumbnail: string; original: string }[];
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  approved: 'bg-blue-500/15   text-blue-400   border-blue-500/30',
  pending: 'bg-orange-500/15  text-orange-400  border-orange-500/30',
  sold: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  draft: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  deleted: 'bg-red-500/15    text-red-400    border-red-500/30',
};

const STATUSES = ['all', 'approved', 'sold', 'pending', 'draft']; // Keeping pending/draft just in case, but focused on approved/sold
const CATEGORIES = ['all', 'Electronics', 'Vehicles', 'Furniture', 'Clothing', 'Books', 'Sports', 'Home & Garden', 'Other'];

export default function AdminDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  /* ── Auth gate ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || u.email !== ADMIN_EMAIL) {
        setAuthChecked(true);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
      setAuthChecked(true);
      await fetchAll();
    });
    return () => unsub();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) || []);
    setLoading(false);
  };

  const handleDelete = async (listing: Listing) => {
    const lid = listing._id || listing.id;
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    setDeleting(lid);
    await supabase.from('listings').delete().eq('_id', lid);
    setListings(prev => prev.filter(l => (l._id || l.id) !== lid));
    if (selectedListing && (selectedListing._id || selectedListing.id) === lid) setSelectedListing(null);
    setDeleting(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  /* ── Derived data ── */
  const filtered = useMemo(() => {
    return listings.filter(l => {
      const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.location?.city?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || l.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [listings, search, statusFilter, categoryFilter]);

  const handleApprove = async (listing: Listing) => {
    const lid = listing._id || listing.id;
    setLoading(true);
    const { error } = await supabase
      .from('listings')
      .update({ status: 'approved' })
      .eq('_id', lid);

    if (error) {
      alert(error.message);
    } else {
      setListings(prev => prev.map(l => (l._id || l.id) === lid ? { ...l, status: 'approved' } : l));
    }
    setLoading(false);
  };



  const handleMarkSold = async (listing: Listing) => {
    const lid = listing._id || listing.id;
    setLoading(true);
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('_id', lid);

    if (error) {
      alert(error.message);
    } else {
      setListings(prev => prev.map(l => (l._id || l.id) === lid ? { ...l, status: 'sold' } : l));
    }
    setLoading(false);
  };

  const stats = [
    { label: 'Total Listings', value: listings.length, icon: <Package size={20} />, color: 'from-violet-500 to-purple-600' },
    { label: 'On Marketplace (Official)', value: listings.filter(l => l.status === 'approved' && l.category === 'OFFICIAL_MARKETPLACE').length, icon: <CheckCircle size={20} />, color: 'from-emerald-500 to-teal-600', active: true },
    { label: 'Sold', value: listings.filter(l => l.status === 'sold').length, icon: <ShoppingBag size={20} />, color: 'from-blue-500 to-indigo-600' },
    { label: 'User Submissions (Pending)', value: listings.filter(l => l.status === 'pending').length, icon: <Clock size={20} />, color: 'from-orange-500 to-red-500' },
    { label: 'Approved (Internal)', value: listings.filter(l => l.status === 'approved' && l.subcategory !== 'OFFICIAL_MARKETPLACE').length, icon: <ShieldCheck size={20} />, color: 'from-amber-500 to-yellow-600' },
    { label: 'Platform Value', value: `₹${listings.filter(l => l.status === 'sold').reduce((s, l) => s + (l.price || 0), 0).toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'from-pink-500 to-rose-600' },
  ];

  const imgSrc = (l: Listing) => {
    const img = l.images?.[0]?.original;
    if (!img) return null;
    return img.startsWith('http') ? img : `http://localhost:4000${img}`;
  };

  /* ── Access denied ── */
  if (authChecked && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10 max-w-md"
        >
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-black mb-3">Access Denied</h1>
          <p className="text-slate-400 mb-8">You don't have permission to access the admin panel.</p>
          <Link href="/" className="bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition">
            Go Home
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0d0d1a] to-slate-950 text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 bg-slate-950/70">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-black text-lg leading-none">Admin Panel</p>
              <p className="text-xs text-slate-400 mt-0.5">AGAINO Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:brightness-110 transition shadow-lg shadow-violet-500/20"
            >
              <Users size={15} /> Users Report
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition border border-white/10"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-10 space-y-10">

        {/* ── Stats ── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => (s as any).active && router.push('/marketplace')}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 ${(s as any).active ? 'cursor-pointer hover:border-emerald-500/50 transition-all active:scale-95' : ''}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-[0.06]`} />
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-md`}>
                  {s.icon}
                </div>
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
                {(s as any).active && (
                  <div className="absolute top-4 right-4 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">LIVE</div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Filters ── */}
        <section className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or city…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-8 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition cursor-pointer"
            >
              {STATUSES.map(s => <option key={s} value={s} className="bg-slate-900">{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition cursor-pointer"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <p className="text-xs text-slate-600 ml-auto">
            Showing <span className="text-slate-300 font-semibold">{filtered.length}</span> of {listings.length}
          </p>
        </section>

        {/* ── Listings Table ── */}
        <section>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/5">
              <Package size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-400 font-semibold">No listings found</p>
              <p className="text-slate-600 text-sm mt-1">Try changing the filters</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur">
              {/* Table head */}
              <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-white/10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <span>Listing</span>
                <span>Price</span>
                <span>Category</span>
                <span>Status</span>
                <span>Contact</span>
                <span>City</span>
                <span>Actions</span>
              </div>

              <AnimatePresence>
                {filtered.map((listing, i) => {
                  const lid = listing._id || listing.id;
                  const src = imgSrc(listing);
                  return (
                    <motion.div
                      key={lid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-white/5 border-hover hover:bg-white/5 transition-colors group"
                    >
                      {/* Listing info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                          {src
                            ? <img src={src} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{listing.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                            {new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{listing.condition}
                          </p>
                          {listing.subcategory === 'OFFICIAL_MARKETPLACE' && (
                            <span className="inline-block mt-1 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">OFFICIAL</span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <p className="text-sm font-bold text-orange-400">₹{listing.price?.toLocaleString()}</p>

                      {/* Category */}
                      <p className="text-xs text-slate-400 truncate">{listing.category || '—'}</p>

                      {/* Status */}
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border w-fit ${STATUS_STYLES[listing.status] || STATUS_STYLES.draft}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {listing.status}
                      </span>

                      {/* Contact */}
                      <p className="text-xs text-slate-400 truncate">{listing.seller_phone || '—'}</p>

                      {/* City */}
                      <p className="text-xs text-slate-400 truncate">{listing.location?.city || '—'}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {listing.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(listing)}
                            title="Approve Listing"
                            className="w-8 h-8 rounded-lg bg-orange-500/20 hover:bg-orange-500/50 text-orange-400 hover:text-orange-300 flex items-center justify-center transition"
                          >
                            <ShieldCheck size={14} />
                          </button>
                        )}
                        {listing.status === 'approved' && (
                          <button
                            onClick={() => handleMarkSold(listing)}
                            title="Mark as Sold"
                            className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/50 text-blue-400 hover:text-blue-300 flex items-center justify-center transition"
                          >
                            <ShoppingBag size={14} />
                          </button>
                        )}
                        <Link
                          href={`/listings/${lid}`}
                          title="View public listing"
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(listing)}
                          disabled={deleting === lid}
                          title="Delete listing"
                          className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/50 text-red-400 hover:text-red-300 flex items-center justify-center transition disabled:opacity-40"
                        >
                          {deleting === lid
                            ? <span className="w-3.5 h-3.5 border-2 border-red-400/50 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
