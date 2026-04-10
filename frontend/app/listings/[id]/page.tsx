'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import api, { getImageUrl } from '@/lib/api';
import { MapPin, Tag, ShieldCheck, ShoppingCart, Phone, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { getSession } from '@/lib/auth';

const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const session = getSession();
    setCurrentUser(session);

    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('listings').select('*').eq('id', id).single().then(({ data, error }) => {
        if (!error && data) {
          setListing(data);
        }
        setLoading(false);
      });
    });
  }, [id]);

  useEffect(() => {
    if (!loading && listing) {
      const isOfficial = listing.subcategory === 'OFFICIAL_MARKETPLACE';
      if (isOfficial) {
        setIsAuthorized(true);
      } else {
        // Private listing - check owner or admin
        const isOwner = currentUser && currentUser.id === listing.seller_id;
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;
        setIsAuthorized(!!(isOwner || isAdmin));
      }
    }
  }, [loading, listing, currentUser]);

  const handlePayment = async () => {
    if (!listing) return;
    setIsProcessing(true);
    try {
      // 1. Create order on the backend
      const { data } = await api.post('/payments/create-order', {
        amount: listing.price,
        currency: 'INR',
        receipt: `rcpt_${listing.id}`.substring(0, 40)
      });

      const order = data.data;

      // 2. Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummy',
        amount: order.amount,
        currency: order.currency,
        name: 'AGAINO Marketplace',
        description: `Purchase of ${listing.title}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            // Remove/hide it from the marketplace by setting status to 'sold'
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);

            alert('Payment Successful! The item has been secured and removed from public listings.');
            window.location.href = '/marketplace';
          } catch (err) {
            alert('Payment Verification Failed!');
          }
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#f97316'
        }
      };

      if (!(window as any).Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please refresh the page.');
      }

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        console.error("Payment failed response:", response);
        alert(`Payment Failed. Reason: ${response.error.description}`);
      });
      rzp1.open();
    } catch (err: any) {
      console.error("Initiation Error:", err);
      // Give a precise error to the user if it's an API error
      if (err.response) {
        alert('Server Error: ' + (err.response?.data?.message || err.message));
      } else {
        alert(err.message || 'Error initiating checkout. Please make sure you are logged in and Razorpay keys are configured.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || isAuthorized === null) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>;
  
  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20">
        <Lock size={36} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-slate-400 max-w-sm mb-8">This listing is private and can only be viewed by the seller or the platform administrator.</p>
      <button onClick={() => window.history.back()} className="bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-white/10 transition">
        Go Back
      </button>
    </div>
  );

  if (!listing) return <div className="text-center py-20 text-muted-foreground text-lg">Listing not found</div>;

  const images = listing.images || [];

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-5xl mx-auto px-4 py-8"
      >
        <div className="grid md:grid-cols-2 gap-10">
          {/* Images Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] glass rounded-3xl overflow-hidden shadow-sm border border-border/50 relative group">
              {images[imgIdx] ? (
                <motion.img 
                  key={imgIdx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  src={getImageUrl(images[imgIdx].original)} 
                  alt={listing.title} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-secondary/20">📦</div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((img: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setImgIdx(i)} 
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${i === imgIdx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                  >
                    <img src={getImageUrl(img.thumbnail)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Checkout */}
          <div className="flex flex-col">
            <div className="mb-6">
              <h1 className="text-3xl font-extrabold text-foreground mb-3 leading-tight tracking-tight">{listing.title}</h1>
              <p className="text-4xl font-black text-primary mb-5 drop-shadow-sm">₹{listing.price.toLocaleString()}</p>

              <div className="flex flex-wrap gap-3 mb-6">
                <span className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full text-sm font-medium border border-border"><Tag size={15} />{listing.category}</span>
                <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide capitalize border border-primary/20"><ShieldCheck size={15} />{listing.condition}</span>
                <span className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full text-sm font-medium border border-border"><MapPin size={15} className="text-muted-foreground" />{listing.location.city}, {listing.location.region}</span>
                {listing.seller_phone && (
                  <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/20">
                    <Phone size={15} /> {listing.seller_phone}
                  </span>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 mb-8 border border-border/50 shadow-sm flex-grow">
              <h3 className="font-bold text-lg mb-3 tracking-tight">Description</h3>
              <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>

            <div className="flex gap-4 mt-auto">
              {listing.status === 'approved' && listing.subcategory === 'OFFICIAL_MARKETPLACE' ? (
                <button 
                  onClick={handlePayment} 
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-4 rounded-2xl hover:brightness-110 text-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <ShoppingCart size={22} /> Buy Now with Razorpay
                    </>
                  )}
                </button>
              ) : (
                <div className="flex-1 bg-secondary/50 text-secondary-foreground font-semibold py-4 rounded-2xl text-center border border-border/50 italic capitalize flex flex-col gap-1">
                  <span>{listing.subcategory === 'OFFICIAL_MARKETPLACE' ? 'Listing' : 'Submission'} Status: {listing.status}</span>
                  {listing.subcategory !== 'OFFICIAL_MARKETPLACE' && <span className="text-[10px] uppercase font-bold text-orange-400 tracking-widest">(Private Submission)</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
