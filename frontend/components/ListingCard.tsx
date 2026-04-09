'use client';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface Listing {
  _id: string;
  title: string;
  price: number;
  condition: string;
  location: { city: string; region: string };
  images: { thumbnail: string; original: string }[];
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHovering && listing.images && listing.images.length > 1) {
      interval = setInterval(() => {
        setImgIdx((prev) => (prev + 1) % listing.images.length);
      }, 1500); // changes image every 1.5 seconds on hover
    } else {
      setImgIdx(0); // reset when not hovering
    }
    return () => clearInterval(interval);
  }, [isHovering, listing.images]);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href={`/listings/${listing._id}`} className="block glass rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden group flex flex-col h-full border border-border/50 bg-card">
        {/* Image Slider */}
        <div className="relative w-full overflow-hidden bg-secondary/20" style={{ paddingBottom: '75%' }}>
          {listing.images && listing.images.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <motion.img
                key={imgIdx}
                src={listing.images[imgIdx]?.original?.startsWith('http') ? listing.images[imgIdx].original : `http://localhost:4000${listing.images[imgIdx]?.original}`}
                alt={listing.title}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 text-5xl bg-secondary/10">📦</div>
          )}
          
          {/* Animated Slider Dots */}
          {listing.images && listing.images.length > 1 && (
            <div className="absolute bottom-2 left-0 w-full flex justify-center gap-1.5 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
              {listing.images.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/50'} transition-all`} />
              ))}
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-grow">
          <p className="font-bold text-primary text-[1.1rem]">₹{listing.price.toLocaleString()}</p>
          <p className="text-foreground font-semibold text-sm line-clamp-2 leading-snug">{listing.title}</p>
          <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium"><MapPin size={13} className="text-primary/70" />{listing.location.city}</span>
            <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full capitalize font-bold tracking-wide">{listing.condition}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
