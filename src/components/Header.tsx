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
        <div className="flex items-center gap-3">
          {/* IOH Iconic Multi-circle Logo SVG */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="38" cy="45" r="28" fill="#FFC72C" opacity="0.9" />
              <circle cx="62" cy="42" r="26" fill="#ED1C24" opacity="0.85" />
              <circle cx="50" cy="62" r="28" fill="#ED0278" opacity="0.9" />
              <circle cx="68" cy="60" r="20" fill="#7C2582" opacity="0.75" />
            </svg>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight tracking-tight">
              Indosat Ooredoo Hutchison
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500">
              Industry-Academia Collaboration
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
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                user.role === 'ADMIN' || user.role === 'SUPERVISOR'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                  : 'bg-[#ED0278]/10 text-[#ED0278] border border-[#ED0278]/20'
              }`}
            >
              {user.role === 'ADMIN' ? 'ADMIN' : user.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'MAGANG'}
            </span>
            <span className="font-extrabold text-slate-800 truncate text-[11px]">
              {user.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(user.role === 'ADMIN' || user.role === 'SUPERVISOR') && (
              <a
                href="/admin"
                className="text-[11px] font-extrabold text-[#ED0278] hover:underline"
              >
                Dashboard Admin
              </a>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
              title="Keluar dari sesi"
            >
              <span>Keluar</span>
              <span className="text-xs">➔</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
