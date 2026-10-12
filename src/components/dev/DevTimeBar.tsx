'use client';

import React, { useState } from 'react';

interface DevTimeBarProps {
  simulatedTime: string | null;
  simulatedDate: string | null;
  onSetSimulatedTime: (time: string | null) => void;
  onSetSimulatedDate: (date: string | null) => void;
  onResetTodayAttendance: () => Promise<void>;
  isResetting?: boolean;
}

export function DevTimeBar({
  simulatedTime,
  simulatedDate,
  onSetSimulatedTime,
  onSetSimulatedDate,
  onResetTodayAttendance,
  isResetting = false,
}: DevTimeBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [customTime, setCustomTime] = useState(simulatedTime || '08:15');
  const [customDate, setCustomDate] = useState(
    simulatedDate || new Date().toISOString().split('T')[0]
  );

  const presets = [
    { label: '08:15 (Tepat Waktu)', time: '08:15', type: 'in' },
    { label: '08:45 (Telat +15m)', time: '08:45', type: 'in' },
    { label: '16:30 (Pulang Cepat)', time: '16:30', type: 'out' },
    { label: '17:35 (Pulang On-Time)', time: '17:35', type: 'out' },
  ];

  const handleApplyCustom = () => {
    if (customTime) onSetSimulatedTime(customTime);
    if (customDate) onSetSimulatedDate(customDate);
  };

  const handleResetToRealTime = () => {
    onSetSimulatedTime(null);
    onSetSimulatedDate(null);
  };

  const isSimulating = Boolean(simulatedTime || simulatedDate);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-white shadow-xl">
      {/* Header / Toggle Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider text-amber-400 uppercase">
            Dev Mode
          </span>
          <span className="text-[11px] text-slate-400">
            {isSimulating ? (
              <span className="text-amber-200 font-semibold">
                Simulasi: {simulatedDate || 'Hari ini'} {simulatedTime || 'Live'}
              </span>
            ) : (
              'Waktu Nyata'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
        >
          <span>{isExpanded ? 'Tutup' : 'Atur Waktu & Reset'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Controls Panel */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col gap-3">
          {/* Presets Grid */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Preset Cepat Skenario:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((p) => {
                const isActive = simulatedTime === p.time;
                return (
                  <button
                    key={p.time}
                    type="button"
                    onClick={() => {
                      onSetSimulatedTime(p.time);
                      setCustomTime(p.time);
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time & Date Pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Jam Simulasi
              </label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tanggal Simulasi
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleApplyCustom}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-2 px-3 rounded-xl transition cursor-pointer active:scale-95 text-center"
            >
              Terapkan Waktu
            </button>
            <button
              type="button"
              onClick={handleResetToRealTime}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-3 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Waktu Asli
            </button>
          </div>

          {/* Iterative Testing Reset Button */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onResetTodayAttendance}
              disabled={isResetting}
              className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 font-bold text-xs py-2 px-3 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{isResetting ? 'Mereset Data...' : 'Reset Status Absensi Hari Ini (Uji Ulang)'}</span>
            </button>
            <p className="text-[10px] text-slate-500 mt-1 text-center">
              Menghapus log absensi tanggal terpilih agar dapat menguji check-in &amp; check-out berulang kali.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
