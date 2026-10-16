'use client';

import React from 'react';
import type { InternProfile, OfficeLocation } from '@/types';

interface ProfileCardProps {
  interns: InternProfile[];
  selectedId: string;
  onSelect?: (id: string) => void;
  locked?: boolean;
  activeLocation?: OfficeLocation;
  onChangeOffice?: () => void;
}

export function ProfileCard({
  interns,
  selectedId,
  onSelect,
  locked = false,
  activeLocation,
  onChangeOffice,
}: ProfileCardProps) {
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

        {/* Locked Identity Badge vs Switch Dropdown */}
        {locked || !onSelect ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-extrabold text-slate-700 shadow-2xs">
            <svg className="w-3.5 h-3.5 text-[#ED0278]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>ID: {active?.id || selectedId}</span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Profil Detail */}
      <div className="flex items-center gap-4">
        {active?.photoUrl ? (
          <img
            src={active.photoUrl}
            alt={active.namaLengkap}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md shadow-pink-500/10 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-pink-500/20 shrink-0">
            {active?.namaLengkap ? active.namaLengkap.charAt(0) : 'U'}
          </div>
        )}
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

      {/* Office Hub Location Badge & Change CTA */}
      {activeLocation && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-6 h-6 rounded-lg bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="truncate">
              <span className="text-[9px] text-slate-400 font-extrabold block uppercase leading-none">
                Lokasi Kerja / Hub
              </span>
              <span className="text-xs font-black text-slate-800 truncate block mt-0.5">
                {activeLocation.name}
              </span>
            </div>
          </div>
          {onChangeOffice && (
            <button
              type="button"
              onClick={onChangeOffice}
              className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 hover:border-[#ED0278] hover:bg-pink-50/20 text-[#ED0278] text-[10px] font-extrabold transition shadow-2xs cursor-pointer shrink-0"
            >
              Ganti Kantor
            </button>
          )}
        </div>
      )}

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
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
