'use client';

import React, { useEffect, useState } from 'react';
import { computeLiveRemarkPreview } from '@/lib/client-remarks';

interface AttendanceActionsProps {
  isWithinRadius: boolean;
  loading: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  savedRemarks?: string;
  workStartTime?: string;
  workEndTime?: string;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export function AttendanceActions({
  isWithinRadius,
  loading,
  checkInTime,
  checkOutTime,
  savedRemarks,
  workStartTime = '08:30',
  workEndTime = '17:30',
  onCheckIn,
  onCheckOut,
}: AttendanceActionsProps) {
  const isCheckedIn = Boolean(checkInTime);
  const isCompleted = Boolean(checkOutTime);
  const [currentTimeStr, setCurrentTimeStr] = useState('08:30');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const livePreview = computeLiveRemarkPreview(
    currentTimeStr,
    isCheckedIn,
    isCompleted,
    workStartTime,
    workEndTime
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Dynamic Live Remark Preview Banner */}
      {!isCompleted && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-xs text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                livePreview.badgeColor === 'emerald'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>Estimasi Status:</span>
          </div>
          <div
            className={`font-extrabold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] ${
              livePreview.badgeColor === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <span>{livePreview.badgeColor === 'emerald' ? '✓' : '⚠️'}</span>
            <span>{livePreview.remarks}</span>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      {!isCheckedIn ? (
        <button
          onClick={onCheckIn}
          disabled={loading || !isWithinRadius}
          className={`w-full py-4 px-6 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
            isWithinRadius
              ? 'bg-[#ED0278] hover:bg-[#D0026B] text-white shadow-pink-500/25 active:scale-95 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <span>☀️</span>
          <span>{loading ? 'Menghubungkan...' : 'Check-In Kehadiran'}</span>
        </button>
      ) : !isCompleted ? (
        <button
          onClick={onCheckOut}
          disabled={loading || !isWithinRadius}
          className={`w-full py-4 px-6 rounded-full font-extrabold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
            isWithinRadius
              ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 active:scale-95 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <span>🌙</span>
          <span>{loading ? 'Menghubungkan...' : 'Check-Out (Selesai Kerja)'}</span>
        </button>
      ) : (
        <div className="w-full py-3.5 px-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs text-center flex items-center justify-center gap-2">
          <span>🎉</span>
          <span>Presensi Hari Ini Lengkap</span>
        </div>
      )}

      {/* Saved Server Remarks (if recorded) */}
      {savedRemarks && (
        <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-[#ED0278]/5 border border-[#ED0278]/15 text-xs">
          <span className="text-slate-500 font-medium">Catatan Presensi:</span>
          <span className="font-extrabold text-[#ED0278]">{savedRemarks}</span>
        </div>
      )}

      {/* Stepper Timeline Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
              isCheckedIn ? 'bg-[#ED0278] text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isCheckedIn ? '✓' : '1'}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam Masuk</div>
            <div className="font-extrabold text-slate-800 font-mono text-sm">{checkInTime || '--:--'}</div>
          </div>
        </div>

        <div className="flex-1 mx-4 h-0.5 bg-slate-100" />

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
              isCompleted ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isCompleted ? '✓' : '2'}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam Pulang</div>
            <div className="font-extrabold text-slate-800 font-mono text-sm">{checkOutTime || '--:--'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
