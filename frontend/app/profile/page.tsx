'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Eye, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getImageUrl } from '@/lib/api';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getSession();
    setUser(session);
    if (session) {
      fetchListings(session.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchListings = async (uid: string) => {
    try {
      const { data, error } = await supabase.from('listings').select('*').eq('seller_id', uid);
      if (error) throw error;
      setListings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      // In a full implementation, you would update the user record in the database with the new avatar URL.
      alert('Avatar uploaded successfully to Supabase Storage!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const deleteListing = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('listings').delete().eq('id', id);
      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user && !loading) return (
    <div className="text-center py-20">
      <p className="text-gray-400 mb-4">Please login to view your profile</p>
      <Link href="/login" className="bg-orange-500 text-white px-6 py-2 rounded-full font-semibold">Login</Link>
    </div>
  );
  
  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-2xl p-6 mb-8 flex items-center gap-4">
        <div className="relative">
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="w-20 h-20 bg-white text-orange-500 rounded-full flex items-center justify-center text-3xl font-bold cursor-pointer overflow-hidden border-4 border-white shadow-md hover:opacity-90 transition"
          >
            {user.avatar ? (
              <img src={getImageUrl(user.avatar)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              user.displayName?.[0]?.toUpperCase()
            )}
          </div>
          <div
            className="absolute bottom-0 right-0 bg-orange-600 rounded-full p-1 border-2 border-white cursor-pointer"
            onClick={() => avatarInputRef.current?.click()}
          >
            {uploadingAvatar ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={12} />
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div>
          <h1 className="text-xl font-bold">{user.displayName}</h1>
          <p className="text-orange-100 text-sm">{user.email}</p>
          <p className="text-orange-200 text-xs mt-1">Click photo to change</p>
        </div>
        <Link href="/listings/create" className="ml-auto flex items-center gap-1 bg-white text-orange-500 font-semibold px-4 py-2 rounded-full hover:bg-orange-50">
          <Plus size={16} /> New Listing
        </Link>

      </div>

      <h2 className="text-lg font-bold mb-4">My Listings ({listings.length})</h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl shadow animate-pulse aspect-square" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>You haven't posted any listings yet.</p>
          <Link href="/listings/create" className="mt-4 inline-block bg-orange-500 text-white px-6 py-2 rounded-full font-semibold">Post Your First Listing</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {listings.map((l) => {
            const thumb = l.images?.[0]?.thumbnail;
            return (
              <div key={l.id} className="bg-white rounded-xl shadow overflow-hidden group relative">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {thumb ? (
                    <img src={getImageUrl(thumb)} alt={l.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📦</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-orange-500">₹{l.price?.toLocaleString()}</p>
                  <p className="text-gray-800 text-sm truncate">{l.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                    l.status === 'approved' ? 'bg-green-100 text-green-600' :
                    l.status === 'sold' ? 'bg-blue-100 text-blue-600' :
                    l.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>{l.status}</span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <Link href={`/listings/${l.id}`} className="bg-white text-gray-600 p-1.5 rounded-lg shadow hover:bg-gray-50">
                    <Eye size={14} />
                  </Link>
                  <button
                    onClick={() => deleteListing(l.id)}
                    disabled={deletingId === l.id}
                    className="bg-white text-red-500 p-1.5 rounded-lg shadow hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
