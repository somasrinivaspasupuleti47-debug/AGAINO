'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import {
  Plus, Package, Tag, MapPin, Trash2, Eye, LogOut,
  TrendingUp, ShoppingBag, CheckCircle, Clock, AlertCircle, ShieldCheck
} from 'lucide-react';

interface Listing {
  _id: string;
  id: string;
  title: string;
  price: number;
  condition: string;
  status: string;
  category: string;
  location: { city: string; region: string };
  images: { thumbnail: string; original: string }[];
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  approved:  'bg-blue-100 text-blue-700 border-blue-200',
  pending:   'bg-orange-100 text-orange-700 border-orange-200',
  sold:      'bg-purple-100 text-purple-700 border-purple-200',
  draft:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  deleted:   'bg-red-100    text-red-700    border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'On Marketplace',
  approved:  'Approved (Pending Publish)',
  pending:   'Waiting for Approval',
  sold:      'Sold',
  draft:     'Draft',
  deleted:   'Deleted',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  published: <CheckCircle size={12} />,
  approved:  <ShieldCheck size={12} />,
  sold:      <ShoppingBag size={12} />,
  pending:   <Clock size={12} />,
  draft:     <Tag size={12} />,
  deleted:   <AlertCircle size={12} />,
};

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push('/login'); return; }
      setUser(u);
      await fetchListings(u.uid);
    });
    return () => unsub();
  }, []);

  const fetchListings = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', uid)
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) || []);
    setLoading(false);
  };

  const handleDelete = async (listing: Listing) => {
    const isProtected = ['approved', 'published', 'sold'].includes(listing.status);
    if (isProtected) {
      alert('Approved or Published items cannot be deleted. Please contact support if you need to remove them.');
      return;
    }
    const id = listing._id || listing.id;
    if (!confirm('Delete this listing?')) return;
    setDeleting(id);
    await supabase.from('listings').delete().eq('_id', id);
    setListings(prev => prev.filter(l => (l._id || l.id) !== id));
    setDeleting(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  /* ── stats ── */
  const total     = listings.length;
  const active    = listings.filter(l => l.status === 'approved').length;
  const sold      = listings.filter(l => l.status === 'sold').length;
  const totalSales = listings
    .filter(l => l.status === 'sold')
    .reduce((s, l) => s + (l.price || 0), 0);

  const stats = [
    { label: 'Total Listings', value: total,                   icon: <Package size={20} />,   color: 'from-violet-500 to-purple-600' },
    { label: 'On Marketplace', value: active,                  icon: <CheckCircle size={20} />,color: 'from-emerald-500 to-teal-600' },
    { label: 'Products Sold',  value: sold,                    icon: <ShoppingBag size={20} />,color: 'from-blue-500 to-indigo-600' },
    { label: 'Platform Value', value: `₹${totalSales.toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'from-orange-500 to-red-500' },
  ];

  const imgSrc = (l: Listing) => {
    const img = l.images?.[0]?.original;
    if (!img) return null;
    return img.startsWith('http') ? img : `http://localhost:4000${img}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/10 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Tag size={18} />
            </div>
            <div>
              <p className="font-bold text-lg leading-none">Seller Dashboard</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                {user?.displayName || user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/listings/create"
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-4 py-2 rounded-xl text-sm hover:brightness-110 transition shadow-lg shadow-orange-500/20"
            >
              <Plus size={16} /> New Listing
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition border border-white/10"
            >
              <LogOut size={16} /> Logout
            </button>
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

        {/* ── Listings Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              My Listings <span className="text-white ml-1">({total})</span>
            </h2>
            {total > 0 && (
              <Link href="/listings/create" className="text-sm text-orange-400 hover:text-orange-300 transition font-medium">
                + Add another
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/5 border border-white/10 h-72 animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24 rounded-2xl border border-dashed border-white/10 bg-white/5"
            >
              <Package size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-slate-300 font-semibold text-xl">No listings yet</p>
              <p className="text-slate-500 text-sm mt-2 mb-6">Post your first item and start selling</p>
              <Link
                href="/listings/create"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold px-6 py-3 rounded-xl hover:brightness-110 transition shadow-lg"
              >
                <Plus size={16} /> Post a Listing
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence>
                {listings.map((listing, i) => {
                  const lid = listing._id || listing.id;
                  const src = imgSrc(listing);
                  return (
                    <motion.div
                      key={lid}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden flex flex-col hover:border-orange-500/40 hover:bg-white/8 transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="relative w-full bg-slate-800" style={{ paddingBottom: '70%' }}>
                        {src ? (
                          <img
                            src={src}
                            alt={listing.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-4xl text-slate-600">📦</div>
                        )}
                        {/* Status badge */}
                        <span className={`absolute top-2.5 left-2.5 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[listing.status] || STATUS_COLORS.draft} backdrop-blur-sm shadow-sm`}>
                          {STATUS_ICONS[listing.status]}
                          {STATUS_LABELS[listing.status] || listing.status}
                        </span>
                        {/* Overlay actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Link
                            href={`/listings/${lid}`}
                            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center transition"
                            title="View listing"
                          >
                            <Eye size={16} />
                          </Link>
                          {!['approved', 'published', 'sold'].includes(listing.status) && (
                            <button
                              onClick={() => handleDelete(listing)}
                              disabled={deleting === lid}
                              className="w-9 h-9 rounded-xl bg-red-500/70 hover:bg-red-500 backdrop-blur flex items-center justify-center transition disabled:opacity-50"
                              title="Delete listing"
                            >
                              {deleting === lid
                                ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                : <Trash2 size={16} />
                              }
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 flex flex-col gap-1.5 flex-grow">
                        <p className="text-base font-bold text-orange-400">₹{listing.price?.toLocaleString()}</p>
                        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{listing.title}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-auto pt-2">
                          <MapPin size={11} className="text-orange-400/70 shrink-0" />
                          <span className="truncate">{listing.location?.city}</span>
                          <span className="ml-auto bg-white/10 px-2 py-0.5 rounded-full capitalize text-[11px]">
                            {listing.condition}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
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
