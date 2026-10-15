'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  internName?: string;
  waStatus: 'disconnected' | 'connecting' | 'open';
  onOpenWaModal: () => void;
}

export function Header({ internName, waStatus, onOpenWaModal }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* IOH Official Brand Logo */}
          <img
            src="/icons/logo.png"
            alt="Indosat Ooredoo Hutchison"
            className="h-7 sm:h-8 w-auto object-contain flex-shrink-0"
          />
          <div className="border-l border-slate-200 pl-2.5 py-0.5">
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight tracking-tight">
              Presensi Magang
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
              IAC Program
            </div>
          </div>
        </div>

        {/* WhatsApp Status Pill */}
        <button
          type="button"
          onClick={onOpenWaModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-[#ED0278] transition shadow-2xs active:scale-95 cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              waStatus === 'open'
                ? 'bg-emerald-500'
                : waStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-400'
            }`}
          />
          <span className="text-[11px] font-bold text-slate-700">
            {waStatus === 'open' ? 'WA Aktif' : waStatus === 'connecting' ? 'Scan WA' : 'WA Offline'}
          </span>
        </button>
      </div>

      {/* Active User Session Bar */}
      {isAuthenticated && user && (
        <div className="pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            {user.role !== 'ADMIN' && (
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                  user.role === 'SUPERVISOR'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-[#ED0278]/10 text-[#ED0278] border border-[#ED0278]/20'
                }`}
              >
                {user.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'MAGANG'}
              </span>
            )}
            <span className="font-extrabold text-slate-800 truncate text-[11px]">
              {user.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user.role === 'INTERN' && (
              <a
                href="/profile"
                className="text-[11px] font-extrabold text-slate-700 hover:text-[#ED0278] transition px-2 py-0.5 rounded-lg hover:bg-slate-50"
              >
                Profil
              </a>
            )}
            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <>
                <a
                  href="/admin"
                  className="text-[11px] font-extrabold text-[#ED0278] hover:underline"
                >
                  Dashboard Admin
                </a>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                  title="Keluar dari sesi"
                >
                  <span>Keluar</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
