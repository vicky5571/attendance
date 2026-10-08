'use client';

import React, { useEffect, useState } from 'react';

interface HeaderProps {
  internName: string;
  waStatus: 'disconnected' | 'connecting' | 'open';
  onOpenWaModal: () => void;
}

export function Header({ internName, waStatus, onOpenWaModal }: HeaderProps) {
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
    <header className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        {/* IOH Iconic Multi-circle Logo SVG */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="38" cy="45" r="28" fill="#FFC72C" opacity="0.9" />
            <circle cx="62" cy="42" r="26" fill="#ED1C24" opacity="0.85" />
            <circle cx="50" cy="62" r="28" fill="#ED0278" opacity="0.9" />
            <circle cx="68" cy="60" r="20" fill="#7C2582" opacity="0.75" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-900 leading-tight tracking-tight">
            Indosat Ooredoo Hutchison
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            Industry-Academia Collaboration Program
          </div>
        </div>
      </div>

      {/* WhatsApp Status Pill */}
      <button
        onClick={onOpenWaModal}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-[#ED0278] transition shadow-xs active:scale-95"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            waStatus === 'open' ? 'bg-emerald-500' : waStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
          }`}
        />
        <span className="text-xs font-bold text-slate-700">
          {waStatus === 'open' ? 'WA Aktif' : waStatus === 'connecting' ? 'Scan WA' : 'WA Offline'}
        </span>
      </button>
    </header>
  );
}
