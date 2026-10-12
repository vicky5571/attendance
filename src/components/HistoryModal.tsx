'use client';

import React, { useState, useEffect } from 'react';
import type { MonthlyTimesheetSummary } from '@/types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  internId: string;
  internName: string;
}

export function HistoryModal({
  isOpen,
  onClose,
  internId,
  internName,
}: HistoryModalProps) {
  const [month, setMonth] = useState('');
  const [summary, setSummary] = useState<MonthlyTimesheetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setMonth(defaultMonth);
      fetchHistory(defaultMonth);
    }
  }, [isOpen, internId]);

  const fetchHistory = async (targetMonth: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/history?internId=${encodeURIComponent(internId)}&month=${encodeURIComponent(targetMonth)}`
      );
      if (res.ok) {
        const data = await res.json();
        const summaryData = data?.summary || data;
        // ensure records array is attached if it's on top-level data
        if (Array.isArray(data?.records) && !summaryData.records) {
          summaryData.records = data.records;
        }
        setSummary(summaryData);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMonth(val);
    if (val) {
      fetchHistory(val);
    }
  };

  const handleDownloadCsv = () => {
    setExporting(true);
    const downloadUrl = `/api/reports/monthly-export?internId=${encodeURIComponent(internId)}&month=${encodeURIComponent(month)}`;
    // Trigger direct browser download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `attendance-${internId}-${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setExporting(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Timesheet & Logbook Magang
            </h3>
            <p className="text-xs text-slate-500">
              Peserta: <strong className="text-slate-800">{internName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Bar & Export Action */}
        <div className="flex items-center justify-between gap-3 my-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Periode:</span>
            <input
              type="month"
              value={month}
              onChange={handleMonthChange}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition"
            />
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{exporting ? 'Mengunduh...' : 'Export CSV'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Memuat analitik timesheet...
            </div>
          ) : !summary ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Tidak ada data riwayat untuk bulan ini.
            </div>
          ) : (
            <>
              {/* Analytics Summary KPI Cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Jam
                  </span>
                  <span className="text-lg font-black text-slate-800 font-mono mt-0.5">
                    {summary.totalWorkHours ?? 0}h
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {(summary.presentDays ?? 0)} hari hadir
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Tepat Waktu
                  </span>
                  <span className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    {(summary.punctualityRate ?? 0)}%
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-0.5">
                    {(summary.onTimeDays ?? 0)} on-time
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-[#ED0278] uppercase tracking-wider">
                    Remote / Cuti
                  </span>
                  <span className="text-lg font-black text-[#ED0278] font-mono mt-0.5">
                    {(summary.wfhDays ?? 0) + (summary.sickDays ?? 0) + (summary.permitDays ?? 0)}
                  </span>
                  <span className="text-[10px] text-pink-600 mt-0.5">
                    WFH: {summary.wfhDays ?? 0} | Sakit: {summary.sickDays ?? 0}
                  </span>
                </div>
              </div>

              {/* Records Timeline Table */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 mb-2">
                  Logbook Harian Bulan Ini ({(summary.records?.length ?? 0)} hari)
                </h4>
                {(!summary.records || summary.records.length === 0) ? (
                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Belum ada presensi yang terekam pada bulan ini.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(summary.records || []).map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 rounded-2xl border border-slate-100 bg-white shadow-xs flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-800 font-mono">
                            {rec.date}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Masuk: {rec.checkInTime || '--:--'} &bull; Pulang:{' '}
                            {rec.checkOutTime || '--:--'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              rec.status === 'ON_TIME'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : rec.status === 'LATE'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {rec.status === 'ON_TIME'
                              ? 'Tepat Waktu'
                              : rec.status === 'LATE'
                              ? 'Terlambat'
                              : rec.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
