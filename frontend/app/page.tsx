'use client';
import Link from 'next/link';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, ShoppingBag, Zap, Tv, Home, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLogged, setIsLogged] = useState(false);

  // Advanced Mouse Tracking Values
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  // Smooth spring physics for the glowing blob
  const springConfig = { stiffness: 60, damping: 20, mass: 0.5 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setIsLogged(!!u);
      setLoading(false);
    });

    const handleMouseMove = (e: MouseEvent) => {
      // Offset by half viewport to center it from top-1/2 left-1/2
      cursorX.set(e.clientX - window.innerWidth / 2);
      cursorY.set(e.clientY - window.innerHeight / 2);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      unsub();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleOpen = () => {
    if (isLogged) {
      router.push('/marketplace');
    } else {
      router.push('/login');
    }
  };

  const ads = [
    { title: "Premium Motorcycles", icon: <Zap size={32} />, desc: "Find the best second-hand rides with unmatched power.", color: "from-orange-400 to-red-500" },
    { title: "Smart Electronics", icon: <Tv size={32} />, desc: "Laptops, phones, and consoles at fraction of the price.", color: "from-blue-400 to-indigo-500" },
    { title: "Modern Home Decor", icon: <Home size={32} />, desc: "Elevate your living space with affordable elegance.", color: "from-emerald-400 to-teal-500" },
  ];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Advanced Animated Cursor Tracking Background */}
      <motion.div 
        className="fixed top-1/2 left-1/2 w-[800px] h-[800px] -mt-[400px] -ml-[400px] bg-gradient-to-tr from-primary/30 to-blue-500/20 rounded-full blur-[140px] pointer-events-none z-0 mix-blend-screen opacity-70"
        style={{ x: smoothX, y: smoothY }}
      />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-20 relative z-10 flex flex-col items-center justify-center min-h-[90vh]">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-primary font-medium text-sm mb-6 shadow-sm">
            <ShieldCheck size={16} /> Secure Premium Marketplace
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
            AGAINO
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Welcome to the future of peer-to-peer commerce. Unleash the best deals on highly-coveted items right in your neighborhood.
          </p>
        </motion.div>

        {/* Advertisement Cards */}
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mb-20">
          {ads.map((ad, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -10, rotateX: 5, rotateY: 5 }}
                className="glass rounded-3xl p-8 border border-border/50 shadow-lg relative overflow-hidden group cursor-pointer h-full"
                style={{ perspective: 1000 }}
              >
                {/* Spotlight hover effect background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${ad.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${ad.color} opacity-10 rounded-full blur-3xl group-hover:opacity-30 group-hover:scale-150 transition-all duration-500`} />
                <div className={`absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr ${ad.color} opacity-0 rounded-full blur-2xl group-hover:opacity-20 transition-all duration-700 delay-100`} />

                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${ad.color} mb-6 shadow-md relative z-10`}
                >
                  {ad.icon}
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-3 relative z-10">{ad.title}</h3>
                <p className="text-muted-foreground relative z-10">{ad.desc}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <button 
            onClick={handleOpen}
            className="group relative flex items-center gap-4 bg-foreground text-background px-10 py-5 rounded-full text-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 flex items-center gap-3">
              Open AGAINO <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </motion.div>

      </div>
    </div>
  );
}
