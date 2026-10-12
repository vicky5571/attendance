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
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
      {/* Top Header & Multi-Hub Location Selector */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="text-sm font-extrabold text-slate-900 truncate">
            Verifikasi Lokasi Kerja
          </div>
          {locations.length > 0 ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Hub:</span>
              <select
                value={selectedLocationId || activeLocation?.id}
                onChange={(e) => onLocationChange && onLocationChange(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 outline-none cursor-pointer hover:border-[#ED0278] transition"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.maxRadiusMeters}m)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Gedung KPPTI Indosat (Radius {maxRadius}m)
            </div>
          )}
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full shrink-0">
          <button
            type="button"
            onClick={onSimulate}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition cursor-pointer ${
              isSimulated
                ? 'bg-[#ED0278] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulasi 0m
          </button>
          <button
            type="button"
            onClick={onRealGps}
            disabled={gpsLoading}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition cursor-pointer ${
              !isSimulated
                ? 'bg-[#ED0278] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {gpsLoading ? 'Scanning...' : 'GPS Asli'}
          </button>
        </div>
      </div>

      {/* Visual Radar Lingkaran */}
      <div className="relative w-44 h-44 my-3 flex items-center justify-center">
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

      {/* Status Alert Banner */}
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
        <span>{feedback.message}</span>
      </div>
    </div>
  );
}
