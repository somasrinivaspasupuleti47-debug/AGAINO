'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

export default function HomePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is admin
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    supabase.from('listings')
      .select('*')
      .eq('status', 'approved')
      .eq('subcategory', 'OFFICIAL_MARKETPLACE')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
      if (!error && data) {
        setListings(data);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white py-12 px-4 relative">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Buy & Sell Anything</h1>
          <p className="text-orange-100 mb-6">Find great deals near you or sell what you no longer need</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            <Link href="/search" className="flex items-center gap-2 bg-white text-gray-500 rounded-full px-5 py-3 flex-1 w-full max-w-md hover:shadow-md transition-shadow">
              <Search size={18} />
              <span>Search for anything...</span>
            </Link>
            
            {isAdmin && (
              <Link 
                href="/listings/create" 
                className="flex items-center gap-2 bg-slate-900 text-white rounded-full px-6 py-3 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
              >
                <Plus size={18} />
                <span className="font-semibold">Add Listings</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Latest Listings</h2>
          {isAdmin && (
            <Link 
              href="/admin/dashboard" 
              className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 transition-colors"
            >
              ADMIN DASHBOARD
            </Link>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-lg">No listings yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {listings.map((l) => <ListingCard key={l._id || l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}

