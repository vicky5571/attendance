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

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
      {/* Error Banner */}
      {errorMsg && (
        <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Email Input */}
      <div className="flex flex-col gap-1 text-left">
        <label className="text-[11px] font-bold text-slate-600">
          Email Perusahaan / Universitas
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrorMsg('');
          }}
          placeholder="nama@ioh.co.id"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
        />
      </div>

      {/* Password Input */}
      <div className="flex flex-col gap-1 text-left">
        <label className="text-[11px] font-bold text-slate-600">
          Password Akun
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMsg('');
            }}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1 py-0.5 cursor-pointer"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 rounded-2xl bg-[#ED0278] hover:bg-[#D4026B] active:bg-[#B8025D] text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-pink-500/20 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Memverifikasi...</span>
          </>
        ) : (
          <span>Masuk ke Sistem</span>
        )}
      </button>

      {/* Quick Demo Credentials Helper */}
      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5 text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Kredensial Demo Cepat:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleFillDemo('sarah@ioh.co.id', 'InternIOH2026!')}
            className="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-pink-300 text-[10px] font-bold text-slate-600 hover:text-[#ED0278] transition cursor-pointer text-center"
          >
            Magang (Sarah)
          </button>
          <button
            type="button"
            onClick={() => handleFillDemo('admin@ioh.co.id', 'AdminIOH2026!')}
            className="flex-1 py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-pink-300 text-[10px] font-bold text-slate-600 hover:text-[#ED0278] transition cursor-pointer text-center"
          >
            Admin (IOH)
          </button>
        </div>
      </div>
    </form>
  );
}
