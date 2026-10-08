'use client';

import React from 'react';

interface RadarCardProps {
  distance: number | null;
  maxRadius: number;
  isWithinRadius: boolean;
  isSimulated: boolean;
  gpsLoading: boolean;
  onSimulate: () => void;
  onRealGps: () => void;
}

export function RadarCard({
  distance,
  maxRadius,
  isWithinRadius,
  isSimulated,
  gpsLoading,
  onSimulate,
  onRealGps,
}: RadarCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-extrabold text-slate-900">Verifikasi Lokasi Kerja</div>
          <div className="text-xs text-slate-500">Gedung KPPTI Indosat (Radius {maxRadius}m)</div>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
          <button
            onClick={onSimulate}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition ${
              isSimulated
                ? 'bg-[#ED0278] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simulasi 0m
          </button>
          <button
            onClick={onRealGps}
            disabled={gpsLoading}
            className={`text-[11px] font-bold px-3 py-1 rounded-full transition ${
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
      <div className="relative w-44 h-44 my-4 flex items-center justify-center">
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
        <span>{isWithinRadius ? '✅' : '⚠️'}</span>
        <span>
          {isWithinRadius
            ? 'Posisi Anda valid untuk melakukan absensi'
            : `Anda berada di luar batas geofence (${maxRadius}m)`}
        </span>
      </div>
    </div>
  );
}
