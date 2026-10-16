'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AdminLoginFormProps {
  onSuccess?: () => void;
}

export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const router = useRouter();
  const { loginAsAdmin } = useAuth();
  const [email, setEmail] = useState('admin@ioh.co.id');
  const [password, setPassword] = useState('AdminIOH2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');
    const res = await loginAsAdmin(email.trim(), password);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess();
      router.push('/admin');
    } else {
      setErrorMsg(res.error || 'Email atau password salah');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 w-full">
      {errorMsg && (
        <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Username / Email Input */}
      <div className="flex flex-col gap-1.5 text-left">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Username atau Email</span>
          <span className="text-[10px] font-black text-[#ED0278]">WAJIB</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#ED0278] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
            </svg>
          </div>
          <input
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin atau admin@ioh.co.id"
            required
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="flex flex-col gap-1.5 text-left">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Password</span>
          <span className="text-[10px] font-semibold text-slate-400">Tersandi</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#ED0278] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:bg-white focus:ring-4 focus:ring-pink-500/10 transition-all shadow-xs font-mono tracking-wide"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Default akun: <strong className="text-slate-700">admin</strong> / <strong className="text-slate-700">admin@ioh.co.id</strong> &bull; Password: <strong className="text-slate-700 font-mono">AdminIOH2026!</strong>
        </p>
      </div>

      {/* Submit Button (Identical Indosat Palette to Peserta Magang) */}
      <button
        type="submit"
        disabled={loading}
        className="group relative w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ED0278] via-[#F43F5E] to-[#ED1C24] hover:opacity-95 active:scale-[0.98] text-white font-extrabold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/35 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Memverifikasi Sesi...</span>
          </>
        ) : (
          <>
            <span>Masuk Sebagai Admin / Mentor</span>
            <svg
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </>
        )}
      </button>

      {/* Security Footer Notice */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 mt-1 font-semibold">
        <span>🔒</span>
        <span>Dilindungi Autentikasi Sesi &amp; Geofencing Anti-Proxy</span>
      </div>
    </form>
  );
}
