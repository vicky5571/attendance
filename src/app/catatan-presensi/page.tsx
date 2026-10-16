'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AttendanceHistoryView } from '@/components/AttendanceHistoryView';

export default function CatatanPresensiPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push('/login');
      } else if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
        router.push('/admin');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || (user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR'))) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ED0278] animate-ping" />
          <span className="text-xs font-bold text-slate-500">
            {user && (user.role === 'ADMIN' || user.role === 'SUPERVISOR')
              ? 'Mengarahkan ke Dashboard Admin...'
              : 'Memeriksa sesi login...'}
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-4xl flex flex-col gap-4 pb-24">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-extrabold text-slate-700 hover:text-[#ED0278] transition px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#ED0278] shadow-2xs"
          >
            <span>←</span>
            <span>Kembali ke Presensi</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#ED0278]/10 text-[#ED0278] text-[10px] font-black tracking-wide uppercase">
              Catatan Presensi Magang
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100">
          <div className="pb-4 mb-4 border-b border-slate-100">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Riwayat Catatan Presensi & Logbook
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Peserta: <strong className="text-slate-800">{user.name}</strong> ({user.id})
            </p>
          </div>

          <AttendanceHistoryView internId={user.id} internName={user.name} />
        </div>
      </div>
    </div>
  );
}