'use client';

import React from 'react';
import type { InternProfile } from '@/types';

interface ProfileCardProps {
  interns: InternProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ProfileCard({ interns, selectedId, onSelect }: ProfileCardProps) {
  const active = interns.find((i) => i.id === selectedId) || interns[0];

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#ED0278]/10 text-[#ED0278] text-[10px] font-black tracking-wide uppercase">
            Peserta Magang IOH
          </span>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              active?.status === 'ACTIVE'
                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                : 'text-slate-500 bg-slate-100 border border-slate-200'
            }`}
          >
            ● {active?.status === 'ACTIVE' ? 'Active' : 'Completed'}
          </span>
        </div>

        {/* Switch Dropdown */}
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 outline-none cursor-pointer hover:border-[#ED0278] transition"
        >
          {interns.map((i) => (
            <option key={i.id} value={i.id}>
              {i.namaLengkap}
            </option>
          ))}
        </select>
      </div>

      {/* Profil Detail */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-pink-500/20">
          {active?.namaLengkap ? active.namaLengkap.charAt(0) : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
            {active?.namaLengkap}
          </h2>
          <p className="text-xs font-semibold text-[#ED0278] mt-0.5 truncate">
            {active?.divisi}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {active?.universitas} &bull; {active?.jurusan}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Mentor: <strong className="text-slate-800">{active?.namaMentor}</strong>
        </div>
        <div className="text-[11px] text-slate-400">
          Periode s/d: <strong>{active?.periodeMagangSelesai}</strong>
        </div>
      </div>
    </div>
  );
}
