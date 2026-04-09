'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Search, Plus, LogOut, ChevronDown, User, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { usePathname } from 'next/navigation';

const ADMIN_EMAIL = 'somasrinivaspasupuleti47@gmail.com';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  // Hide navbar entirely on the landing page
  if (pathname === '/') return null;

  return (
    <nav className="fixed w-full top-0 z-50 glass border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl drop-shadow-sm transition-transform hover:scale-105 active:scale-95">
          <img src="/logo.png" alt="AGAINO Logo" className="h-9 w-auto object-contain dark:invert" />
        </Link>

        {pathname !== '/' && (
          <Link href="/search" className="flex-1 mx-6 hidden md:block group">
            <div className="flex items-center bg-secondary/50 hover:bg-secondary/80 text-muted-foreground rounded-full px-4 py-2 gap-2 transition-all border border-border/50 focus-within:ring-2 focus-within:ring-ring">
              <Search size={16} />
              <span className="text-sm">Search premium listings...</span>
            </div>
          </Link>
        )}

        <div className={`flex items-center gap-4 ${pathname === '/' ? 'ml-auto' : ''}`}>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-secondary transition-colors text-foreground/80 hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          {user ? (
            <>
              {/* User avatar dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-secondary px-2 py-1.5 rounded-full transition"
                >
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border border-primary/20">
                    {user.avatar ? (
                      <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:4000${user.avatar}`} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      user.displayName?.[0]?.toUpperCase()
                    )}
                  </div>
                  <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute right-0 mt-3 w-56 glass rounded-2xl shadow-xl border border-border/50 py-2 text-foreground text-sm overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-border/50 bg-secondary/30">
                        <p className="font-semibold">{user.displayName}</p>
                        <p className="text-muted-foreground text-xs truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/80 transition-colors">
                          <User size={16} className="text-muted-foreground" /> My Profile
                        </Link>
                        {user.email === ADMIN_EMAIL && (
                          <Link href="/listings/create" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/80 transition-colors">
                            <Plus size={16} className="text-muted-foreground" /> Post Listing
                          </Link>
                        )}
                      </div>
                      <div className="border-t border-border/50 py-1">
                        <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 text-destructive w-full transition-colors font-medium">
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Log In</Link>
              <Link href="/register" className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-full text-sm hover:brightness-110 shadow-sm transition-all transform hover:scale-105 active:scale-95">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
