'use client';

import React, { useState, useEffect } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState(simulatedTime || '08:15');
  const [customDate, setCustomDate] = useState(
    simulatedDate || new Date().toISOString().split('T')[0]
  );
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const presets = [
    { label: '08:15 (Tepat Waktu)', time: '08:15', desc: 'Sebelum 08:30' },
    { label: '08:45 (Telat +15m)', time: '08:45', desc: 'Lewat 08:30' },
    { label: '16:30 (Pulang Cepat)', time: '16:30', desc: 'Lebih awal 60m' },
    { label: '17:35 (Pulang On-Time)', time: '17:35', desc: 'Setelah 17:30' },
  ];

  const handleSelectPreset = (time: string) => {
    setCustomTime(time);
    onSetSimulatedTime(time);
    const activeDate = customDate || new Date().toISOString().split('T')[0];
    onSetSimulatedDate(activeDate);
  };

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
    <>
      {/* Floating Trigger Pill (Fixed Bottom Right, does NOT break page layout) */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all active:scale-95 cursor-pointer text-xs font-bold hover:border-amber-400 group"
          aria-label="Buka Developer Mode Toolbar"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 font-extrabold uppercase text-[10px] tracking-wider">
            Dev Mode
          </span>
          <span className="text-[11px] text-slate-300 font-mono">
            {isSimulating ? `${simulatedTime || 'Simulasi'}` : `${currentTimeStr || 'Live'}`}
          </span>
          <span className="text-slate-400 group-hover:text-amber-300 transition text-xs">
            ⚙️
          </span>
        </button>
      </div>

      {/* Slide-up Bottom Sheet Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 text-white rounded-3xl p-5 shadow-2xl border border-slate-800 flex flex-col gap-4 relative max-h-[92dvh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <div>
                  <h2 className="text-sm font-black text-amber-400 tracking-tight flex items-center gap-2">
                    <span>Developer Time Simulator</span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Dev Tool
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isSimulating ? (
                      <span className="text-amber-300 font-semibold">
                        Simulasi Aktif: {simulatedDate || 'Hari Ini'} &bull; {simulatedTime} WIB
                      </span>
                    ) : (
                      'Waktu Nyata: ' + (currentTimeStr || 'Live') + ' WIB'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition cursor-pointer"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Presets Grid */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Preset Cepat Skenario:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => {
                  const isActive = simulatedTime === p.time;
                  return (
                    <button
                      key={p.time}
                      type="button"
                      onClick={() => handleSelectPreset(p.time)}
                      className={`text-left p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-0.5 active:scale-95 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold leading-tight">{p.time}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 truncate">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Inputs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Jam Simulasi
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Tanggal Simulasi
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyCustom}
                className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20 text-center"
              >
                Terapkan Waktu
              </button>
              <button
                type="button"
                onClick={handleResetToRealTime}
                className="bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-300 font-extrabold text-xs py-2.5 px-3.5 rounded-xl border border-slate-700 transition cursor-pointer text-center"
              >
                Waktu Asli
              </button>
            </div>

            {/* Reset Attendance Status */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={onResetTodayAttendance}
                disabled={isResetting}
                className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 font-extrabold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{isResetting ? 'Mereset Data...' : 'Reset Status Absensi Hari Ini (Uji Ulang)'}</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center leading-tight">
                Menghapus catatan absensi hari ini agar check-in &amp; check-out dapat diuji berulang kali.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
