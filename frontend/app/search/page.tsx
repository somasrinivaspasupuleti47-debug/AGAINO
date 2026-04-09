'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ListingCard from '@/components/ListingCard';
import { Search, SlidersHorizontal } from 'lucide-react';

const CATEGORIES = ['All', 'Electronics', 'Vehicles', 'Furniture', 'Clothing', 'Books', 'Sports', 'Home & Garden', 'Other'];

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [category, setCategory] = useState('All');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState('newest');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      let query = supabase.from('listings').select('*');
      
      if (q.trim()) {
        query = query.ilike('title', `%${q.trim()}%`);
      }
      if (category !== 'All') {
        query = query.eq('category', category);
      }
      if (condition) {
        query = query.eq('condition', condition);
      }

      if (sort === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error('Search error:', err);
      setListings([]);
    }
    setLoading(false);
  };

  // Re-search when filters change
  useEffect(() => { search(); }, [category, condition, sort]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 flex items-center border rounded-xl px-4 py-2.5 bg-white shadow-sm gap-2">
          <Search size={18} className="text-gray-400" />
          <input className="flex-1 focus:outline-none" placeholder="Search listings..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        </div>
        <button onClick={search} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-orange-600">Search</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${category === c ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>{c}</button>
        ))}
        <select className="ml-auto border rounded-full px-3 py-1.5 text-sm focus:outline-none" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <select className="border rounded-full px-3 py-1.5 text-sm focus:outline-none" value={condition} onChange={e => setCondition(e.target.value)}>
          <option value="">Any Condition</option>
          <option value="new">New</option>
          <option value="used">Used</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl shadow animate-pulse aspect-square" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>No listings found. Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {listings.map((l) => <ListingCard key={l._id} listing={l} />)}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>;
}
