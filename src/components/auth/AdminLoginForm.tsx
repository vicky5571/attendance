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
      <div>
        <label className="block text-xs font-extrabold text-slate-700 mb-1">
          Username atau Email
        </label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin atau admin@ioh.co.id"
          required
          className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition"
        />
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-xs font-extrabold text-slate-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
          >
            {showPassword ? 'Sembunyi' : 'Lihat'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Default akun: <strong className="text-slate-700">admin</strong> / <strong className="text-slate-700">admin@ioh.co.id</strong> &bull; Password: <strong className="text-slate-700 font-mono">AdminIOH2026!</strong>
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-6 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-slate-900/10 cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>Memverifikasi...</span>
          </>
        ) : (
          <span>Masuk Sebagai Admin / Mentor</span>
        )}
      </button>
    </form>
  );
}
