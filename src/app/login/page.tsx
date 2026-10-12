'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UnifiedLoginForm } from '@/components/auth/UnifiedLoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated && user) {
      if (user.role === 'INTERN') {
        router.push('/');
      } else {
        router.push('/admin');
      }
    }
  }, [mounted, isAuthenticated, isLoading, user, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#ED0278] animate-ping" />
          <span className="text-xs font-bold text-slate-500 tracking-wide">Memverifikasi sesi login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F8FAFC] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      {/* Dynamic Ambient Glow Mesh Background */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#FFC72C]/15 blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#ED0278]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-[#7C2582]/12 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#ED1C24]/12 blur-3xl pointer-events-none" />

      {/* Subtle Dot Grid Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* Top Company Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs mb-5 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold text-slate-700 tracking-tight">
            Indosat Ooredoo Hutchison
          </span>
          <span className="text-[10px] font-bold text-slate-400">&bull;</span>
          <span className="text-[10px] font-bold text-[#ED0278]">IAC Portal</span>
        </div>

        {/* Executive Glass Card */}
        <div className="w-full bg-white/90 backdrop-blur-2xl rounded-[36px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(237,2,120,0.12),0_10px_30px_-5px_rgba(15,23,42,0.06)] border border-white/80 flex flex-col items-center text-center">
          {/* IOH Iconic Multi-circle Brand Emblem */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-50 via-white to-pink-50/30 shadow-md border border-slate-100 flex items-center justify-center mb-3.5">
            <div className="w-11 h-11 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
                <circle cx="38" cy="45" r="28" fill="#FFC72C" opacity="0.95" />
                <circle cx="62" cy="42" r="26" fill="#ED1C24" opacity="0.9" />
                <circle cx="50" cy="62" r="28" fill="#ED0278" opacity="0.95" />
                <circle cx="68" cy="60" r="20" fill="#7C2582" opacity="0.85" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            Sistem Presensi Magang
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 mb-6 max-w-[280px]">
            Masuk dengan akun terdaftar untuk verifikasi kehadiran dan geofencing multi-hub.
          </p>

          {/* Unified Corporate Login Form */}
          <UnifiedLoginForm />

          {/* Enterprise Security & Trust Tags */}
          <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              HttpOnly Session
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Geofencing KPPTI &amp; BSD
            </span>
          </div>
        </div>

        {/* Footer Copyright */}
        <p className="text-[11px] font-semibold text-slate-400 text-center mt-6">
          &copy; 2026 Indosat Ooredoo Hutchison &bull; Industry-Academia Collaboration
        </p>
      </div>
    </div>
  );
}
