'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface UnifiedLoginFormProps {
  onSuccess?: () => void;
}

export function UnifiedLoginForm({ onSuccess }: UnifiedLoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activePreset, setActivePreset] = useState<'sarah' | 'admin' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(result.error || 'Email atau password yang dimasukkan salah');
    }
  };

  const handleFillPreset = (presetKey: 'sarah' | 'admin', presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setActivePreset(presetKey);
    setErrorMsg('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-semibold animate-shake">
          <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="flex-1 text-left">{errorMsg}</span>
        </div>
      )}

      {/* Email Input */}
      <div className="flex flex-col gap-1.5 text-left">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Email Korporat / Kampus</span>
          <span className="text-[10px] font-semibold text-pink-600">Wajib</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#ED0278] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
            </svg>
          </div>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setActivePreset(null);
              setErrorMsg('');
            }}
            placeholder="nama@ioh.co.id"
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
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setActivePreset(null);
              setErrorMsg('');
            }}
            placeholder="••••••••••••"
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
      </div>

      {/* Submit Button */}
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
            <span>Masuk ke Dashboard Presensi</span>
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

      {/* Quick Access Account Chips */}
      <div className="mt-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Akun Percobaan (1-Klik Isi)
          </span>
          <span className="text-[9px] font-semibold text-slate-400">Sandbox IOH</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Preset: Intern Sarah */}
          <button
            type="button"
            onClick={() => handleFillPreset('sarah', 'sarah@ioh.co.id', 'InternIOH2026!')}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
              activePreset === 'sarah'
                ? 'bg-pink-50 border-pink-300 shadow-xs'
                : 'bg-white border-slate-200 hover:border-pink-200 hover:bg-pink-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-tight text-pink-600 bg-pink-100/80 px-1.5 py-0.5 rounded-md">
                Magang
              </span>
              {activePreset === 'sarah' && (
                <svg className="w-3 h-3 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Sarah N.</span>
            <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">sarah@ioh.co.id</span>
          </button>

          {/* Preset: Admin */}
          <button
            type="button"
            onClick={() => handleFillPreset('admin', 'admin@ioh.co.id', 'AdminIOH2026!')}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
              activePreset === 'admin'
                ? 'bg-pink-50 border-pink-300 shadow-xs'
                : 'bg-white border-slate-200 hover:border-pink-200 hover:bg-pink-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-tight text-purple-600 bg-purple-100/80 px-1.5 py-0.5 rounded-md">
                Admin
              </span>
              {activePreset === 'admin' && (
                <svg className="w-3 h-3 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[11px] font-extrabold text-slate-800 leading-tight">Supervisor</span>
            <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">admin@ioh.co.id</span>
          </button>
        </div>
      </div>
    </form>
  );
}
