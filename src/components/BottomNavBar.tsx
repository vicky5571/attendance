'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Do not render if auth is loading, user not logged in, or user is admin/supervisor
  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return null;
  }

  // Do not render on auth pages or admin routes
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  const isHomeActive = pathname === '/';
  const isProfilActive = pathname.startsWith('/profile');

  const handleAbsensiClick = () => {
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('trigger-attendance-punch'));
    } else {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auto_trigger_punch', 'true');
      }
      router.push('/');
    }
  };

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between relative">
        {/* Tab 1: Beranda */}
        <Link
          href="/"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 group relative transition-all duration-200 active:scale-95"
        >
          <div
            className={`w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              isHomeActive
                ? 'bg-[#ED0278]/10 text-[#ED0278] ring-1 ring-[#ED0278]/25 shadow-xs shadow-pink-500/10'
                : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'
            }`}
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:scale-105"
              fill={isHomeActive ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isHomeActive ? 2.2 : 1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] tracking-tight leading-tight mt-0.5 ${
              isHomeActive
                ? 'font-black text-[#ED0278]'
                : 'font-semibold text-slate-500 group-hover:text-slate-700'
            }`}
          >
            Beranda
          </span>
        </Link>

        {/* Tab 2: Absensi (Center Action Button - GoPay QRIS Style dengan Palet Indosat) */}
        <button
          type="button"
          onClick={handleAbsensiClick}
          className="flex flex-col items-center justify-center flex-1 relative -top-3 group cursor-pointer active:scale-95 transition-transform duration-150"
          title="Lakukan Presensi Langsung"
        >
          {/* Outer Halo Notch Ring */}
          <div className="p-1 rounded-[24px] bg-white border-2 border-slate-100 shadow-xl shadow-pink-500/10">
            {/* Inner Vibrant Indosat Magenta Capsule */}
            <div className="w-15 h-10 sm:w-16 sm:h-11 rounded-[20px] bg-gradient-to-tr from-[#ED0278] via-[#FF2686] to-[#FF4B98] flex items-center justify-center text-white shadow-md shadow-[#ED0278]/30 group-hover:shadow-lg group-hover:shadow-[#ED0278]/50 group-hover:scale-105 transition-all duration-200">
              {/* GoPay-Style Scanner / Punch Icon */}
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 4H5a2 2 0 00-2 2v2m0 8v2a2 2 0 002 2h2m10-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2M8 12h8"
                />
              </svg>
            </div>
          </div>
          <span className="text-[11px] tracking-tight leading-tight mt-0.5 font-bold text-slate-700 group-hover:text-[#ED0278]">
            Absensi
          </span>
        </button>

        {/* Tab 3: Profil */}
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center flex-1 h-full py-1 group relative transition-all duration-200 active:scale-95"
        >
          <div
            className={`w-14 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
              isProfilActive
                ? 'bg-[#ED0278]/10 text-[#ED0278] ring-1 ring-[#ED0278]/25 shadow-xs shadow-pink-500/10'
                : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'
            }`}
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:scale-105"
              fill={isProfilActive ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isProfilActive ? 2.2 : 1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <span
            className={`text-[11px] tracking-tight leading-tight mt-0.5 ${
              isProfilActive
                ? 'font-black text-[#ED0278]'
                : 'font-semibold text-slate-500 group-hover:text-slate-700'
            }`}
          >
            Profil
          </span>
        </Link>
      </div>

      {/* iOS Home Indicator Bar */}
      <div className="w-32 h-1 bg-slate-200 rounded-full mx-auto mt-0.5 mb-1" />
    </nav>
  );
}
