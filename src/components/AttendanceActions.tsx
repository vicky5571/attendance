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
  simulatedTimeStr?: string;
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
  simulatedTimeStr,
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

  const effectiveTimeStr = simulatedTimeStr || currentTimeStr;

  const livePreview = computeLiveRemarkPreview(
    effectiveTimeStr,
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
            <span>
              Estimasi Status
              {simulatedTimeStr ? (
                <span className="ml-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                  Simulasi {simulatedTimeStr}
                </span>
              ) : (
                ':'
              )}
            </span>
          </div>
          <div
            className={`font-extrabold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] ${
              livePreview.badgeColor === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {livePreview.badgeColor === 'emerald' ? (
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>{loading ? 'Menghubungkan...' : 'Check-Out (Selesai Kerja)'}</span>
        </button>
      ) : (
        <div className="w-full py-3.5 px-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
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
            {isCheckedIn ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              '1'
            )}
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
            {isCompleted ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              '2'
            )}
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
