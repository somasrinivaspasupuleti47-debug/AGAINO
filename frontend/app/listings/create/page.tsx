'use client';
import { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ImagePlus, X } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Vehicles', 'Furniture', 'Clothing', 'Books', 'Sports', 'Home & Garden', 'Other'];
const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

export default function CreateListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    category: '', subcategory: 'General',
    condition: 'used', location: { city: '', region: '' },
    mobile: ''
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userAuth, setUserAuth] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push('/login');
      } else {
        setUserAuth(u);
      }
    });
    return () => unsub();
  }, []);

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - images.length;
    const toAdd = files.slice(0, remaining);
    setImages(prev => [...prev, ...toAdd]);
    const newPreviews = toAdd.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(previews[idx]);
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) { setError('Please add at least 1 photo'); return; }
    if (!userAuth) { setError('You must be logged in.'); return; }
    
    setLoading(true); setError('');
    try {
      // Step 1: create listing
      const isAdminCreate = userAuth.email === ADMIN_EMAIL;
      
      const { data, error: insertError } = await supabase.from('listings').insert({
        ...form,
        price: Number(form.price),
        seller_id: userAuth.uid,
        seller_phone: form.mobile,
        status: isAdminCreate ? 'approved' : 'pending',
        subcategory: isAdminCreate ? 'OFFICIAL_MARKETPLACE' : 'General'
      }).select().single();
      
      if (insertError) throw insertError;
      const listingId = data._id || data.id; // handle case depending on _id vs id

      // Step 2: upload images to backend directly
      const uploadedImages = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append('images', img));
        
        const uploadRes = await fetch('http://localhost:4000/api/v1/listings/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.message || 'Failed to upload images to backend');
        }
        
        const upData = await uploadRes.json();
        if (upData.data && Array.isArray(upData.data)) {
           uploadedImages.push(...upData.data);
        }
      }

      // Step 3: updating listing with image paths
      if (uploadedImages.length > 0) {
        await supabase.from('listings').update({ images: uploadedImages }).eq('_id', listingId);
      }

      if (isAdminCreate) {
        router.push('/marketplace');
      } else {
        router.push('/seller/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Post a Listing</h1>
      {error && (
        <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5 bg-white rounded-2xl shadow p-6">

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos <span className="text-orange-500">*</span>
            <span className="text-gray-400 font-normal ml-1">({images.length}/5 — min 1, max 5)</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-200">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                  <X size={12} />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center text-orange-400 hover:bg-orange-50 transition">
                <ImagePlus size={24} />
                <span className="text-xs mt-1">Add Photo</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            multiple className="hidden" onChange={handleImageSelect} />
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP. Max 5MB each.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-orange-500">*</span></label>
          <input className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="What are you selling?" value={form.title}
            onChange={e => set('title', e.target.value)} required maxLength={100} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-orange-500">*</span></label>
          <textarea className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 h-28 resize-none"
            placeholder="Describe your item, its condition, any defects..." value={form.description}
            onChange={e => set('description', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) <span className="text-orange-500">*</span></label>
            <input className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              type="number" min="0" placeholder="0" value={form.price}
              onChange={e => set('price', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition <span className="text-orange-500">*</span></label>
            <select className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.condition} onChange={e => set('condition', e.target.value)}>
              <option value="used">Used</option>
              <option value="new">New</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-orange-500">*</span></label>
          <select className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={form.category} onChange={e => set('category', e.target.value)} required>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-orange-500">*</span></label>
            <input className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="City" value={form.location.city}
              onChange={e => set('location', { ...form.location, city: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-orange-500">*</span></label>
            <input className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="State" value={form.location.region}
              onChange={e => set('location', { ...form.location, region: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-orange-500">*</span></label>
            <input className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="10-digit mobile" type="tel" pattern="[0-9]{10}"
              value={form.mobile} onChange={e => set('mobile', e.target.value)} required />
          </div>
        </div>

        <button disabled={loading} className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 disabled:opacity-60 text-lg">
          {loading ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
    </div>
  );
}
