'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { UnifiedLoginForm } from '@/components/auth/UnifiedLoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'intern' | 'admin'>('intern');

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'INTERN') {
        router.push('/');
      } else {
        router.push('/admin');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ED0278] animate-ping" />
          <span className="text-xs font-bold text-slate-500">Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 flex flex-col items-center">
        {/* IOH Brand Header */}
        <div className="flex items-center justify-center mb-3">
          <img
            src="/icons/logo.png"
            alt="Indosat Ooredoo Hutchison"
            className="h-10 sm:h-11 w-auto object-contain"
          />
        </div>
        <h1 className="text-lg font-black text-slate-900 tracking-tight text-center">
          Sistem Presensi Magang
        </h1>
        <p className="text-[11px] font-semibold text-slate-400 text-center mt-0.5 mb-5">
          Indosat Ooredoo Hutchison &bull; IAC Program
        </p>

        {/* Dual Tab Switcher */}
        <div className="flex items-center w-full bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('intern')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer text-center ${
              activeTab === 'intern'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Peserta Magang
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer text-center ${
              activeTab === 'admin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin / Mentor
          </button>
        </div>

        {/* Active Form */}
        {activeTab === 'intern' ? (
          <UnifiedLoginForm />
        ) : (
          <AdminLoginForm />
        )}

        {/* Security Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            🔒 Dilindungi Autentikasi Sesi & Geofencing Anti-Proxy
          </p>
        </div>
      </div>
    </div>
  );
}
