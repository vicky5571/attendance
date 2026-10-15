'use client';

import React from 'react';
import { formatDistanceFeedback } from '@/lib/client-geo';
import type { OfficeLocation } from '@/types';

interface RadarCardProps {
  distance: number | null;
  maxRadius: number;
  isWithinRadius: boolean;
  isSimulated: boolean;
  gpsLoading: boolean;
  locations?: OfficeLocation[];
  selectedLocationId?: string;
  onLocationChange?: (id: string) => void;
  onSimulate: () => void;
  onRealGps: () => void;
}

export function RadarCard({
  distance,
  maxRadius,
  isWithinRadius,
  isSimulated,
  gpsLoading,
  locations = [],
  selectedLocationId,
  onLocationChange,
  onSimulate,
  onRealGps,
}: RadarCardProps) {
  const feedback = formatDistanceFeedback(distance, maxRadius);
  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100 flex flex-col items-center gap-4">
      {/* 1. Header Row: Title & GPS Mode Toggle */}
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex flex-col text-left">
          <h2 className="text-sm font-black text-slate-900 tracking-tight">
            Verifikasi Lokasi Kerja
          </h2>
          <p className="text-[10px] font-semibold text-slate-400">
            Geofencing Presensi Anti-Proxy
          </p>
        </div>

        {/* Toggle Mode: Simulasi vs GPS Asli */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full shrink-0 border border-slate-200/60">
          <button
            type="button"
            onClick={onSimulate}
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full transition cursor-pointer ${
              isSimulated
                ? 'bg-[#ED0278] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Simulasi 0m
          </button>
          <button
            type="button"
            onClick={onRealGps}
            disabled={gpsLoading}
            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full transition cursor-pointer ${
              !isSimulated
                ? 'bg-[#ED0278] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {gpsLoading ? 'Scanning...' : 'GPS Asli'}
          </button>
        </div>
      </div>

      {/* 2. Hub Kantor Selector Bar */}
      <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#ED0278] flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Lokasi Kantor
            </span>
            {locations.length > 0 ? (
              <select
                value={selectedLocationId || activeLocation?.id}
                onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer truncate w-full"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-slate-800 truncate">
                Gedung KPPTI Indosat
              </span>
            )}
          </div>
        </div>

        <span className="text-[10px] font-extrabold text-[#ED0278] bg-pink-100/70 border border-pink-200/60 px-2 py-0.5 rounded-lg shrink-0">
          Radius {maxRadius}m
        </span>
      </div>

      {/* 3. Visual Radar Lingkaran */}
      <div className="relative w-44 h-44 my-1 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border border-slate-200/80 bg-slate-50/50" />
        <div className="absolute inset-4 rounded-full border border-slate-200/50" />

        {/* Pulse Effect */}
        <div
          className={`absolute inset-8 rounded-full animate-ping opacity-25 ${
            isWithinRadius ? 'bg-emerald-500' : 'bg-[#ED0278]'
          }`}
        />

        {/* Center Badge */}
        <div
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg transition-all border-2 ${
            isWithinRadius
              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-500/10'
              : 'bg-pink-50 border-[#ED0278] text-[#ED0278] shadow-pink-500/10'
          }`}
        >
          <span className="text-2xl font-black font-mono tracking-tight">
            {distance !== null ? `${distance}m` : '...'}
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">
            {isWithinRadius ? 'Di Kantor' : 'Luar Radius'}
          </span>
        </div>
      </div>

      {/* 4. Status Alert Banner */}
      <div
        className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold text-center border flex items-center justify-center gap-2 ${
          isWithinRadius
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}
      >
        {isWithinRadius ? (
          <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <span className="leading-tight">{feedback.message}</span>
      </div>
    </div>
  );
}
