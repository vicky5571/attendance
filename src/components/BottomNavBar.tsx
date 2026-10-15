'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function BottomNavBar() {
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
  const isAbsensiActive = pathname === '/catatan-presensi';
  const isProfilActive = pathname.startsWith('/profile');

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around relative">
        {/* Tab 1: Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 group relative transition-all duration-200 active:scale-95 ${
            isHomeActive ? 'text-[#ED0278]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isHomeActive && (
            <span className="absolute top-0 w-8 h-1 bg-[#ED0278] rounded-full transition-all duration-300" />
          )}
          <svg
            className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${
              isHomeActive ? 'text-[#ED0278]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
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
          <span
            className={`text-[10px] tracking-tight leading-none ${
              isHomeActive ? 'font-black text-[#ED0278]' : 'font-semibold text-slate-500'
            }`}
          >
            Home
          </span>
        </Link>

        {/* Tab 2: Absensi (Center Action Tab - GoPay Style) */}
        <Link
          href="/catatan-presensi"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 group relative transition-all duration-200 active:scale-95 ${
            isAbsensiActive ? 'text-[#ED0278]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isAbsensiActive && (
            <span className="absolute top-0 w-8 h-1 bg-[#ED0278] rounded-full transition-all duration-300" />
          )}
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center -mt-1 transition-all duration-200 ${
              isAbsensiActive
                ? 'bg-[#ED0278]/10 text-[#ED0278] ring-2 ring-[#ED0278]/20'
                : 'bg-slate-50 text-slate-500 group-hover:bg-[#ED0278]/5 group-hover:text-[#ED0278]'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill={isAbsensiActive ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isAbsensiActive ? 2.2 : 1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <span
            className={`text-[10px] tracking-tight leading-none mt-0.5 ${
              isAbsensiActive ? 'font-black text-[#ED0278]' : 'font-semibold text-slate-500'
            }`}
          >
            Absensi
          </span>
        </Link>

        {/* Tab 3: Profil */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 group relative transition-all duration-200 active:scale-95 ${
            isProfilActive ? 'text-[#ED0278]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isProfilActive && (
            <span className="absolute top-0 w-8 h-1 bg-[#ED0278] rounded-full transition-all duration-300" />
          )}
          <svg
            className={`w-5 h-5 mb-1 transition-transform group-hover:scale-110 ${
              isProfilActive ? 'text-[#ED0278]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
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
          <span
            className={`text-[10px] tracking-tight leading-none ${
              isProfilActive ? 'font-black text-[#ED0278]' : 'font-semibold text-slate-500'
            }`}
          >
            Profil
          </span>
        </Link>
      </div>
    </nav>
  );
}
