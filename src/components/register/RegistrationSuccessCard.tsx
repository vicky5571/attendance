'use client';

import React from 'react';

export interface RegistrationSuccessCardProps {
  namaLengkap: string;
  email: string;
  photoUrl?: string;
  onNavigateToLogin: () => void;
}

export function RegistrationSuccessCard({
  namaLengkap,
  email,
  photoUrl,
  onNavigateToLogin,
}: RegistrationSuccessCardProps) {
  const initials = namaLengkap
    ? namaLengkap
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : 'MG';

  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center animate-fade-in">
      {/* Success Badge */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
        <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
        Pendaftaran Berhasil!
      </h2>
      <p className="text-xs text-slate-500 mb-6">
        Akun peserta magang dan foto referensi biometrik Anda telah tersimpan secara resmi.
      </p>

      {/* Profile Detail Card */}
      <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200/70 mb-6 flex items-center gap-3.5 text-left">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Foto Profil"
            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#ED0278]/10 text-[#ED0278] flex items-center justify-center font-bold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="text-sm font-extrabold text-slate-900 truncate">
            {namaLengkap}
          </p>
          <p className="text-xs text-slate-500 font-medium truncate">
            {email}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700">
            Status: ACTIVE (Terverifikasi)
          </span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
        Silakan masuk menggunakan kredensial email dan password yang baru Anda buat untuk memulai presensi magang.
      </p>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onNavigateToLogin}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ED0278] to-[#FF4500] hover:from-[#c40062] hover:to-[#e03d00] text-white text-sm font-black tracking-wide shadow-lg shadow-pink-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <span>Masuk ke Halaman Login</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </div>
  );
}
