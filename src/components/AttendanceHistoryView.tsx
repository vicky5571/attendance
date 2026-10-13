'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { MonthlyTimesheetSummary, AttendanceRecord, AttendanceRequest } from '@/types';

interface AttendanceHistoryViewProps {
  internId: string;
  internName: string;
  isModal?: boolean;
  onClose?: () => void;
}

interface MergedLogItem {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPHA' | 'BELUM_PRESENSI';
  statusLabel: string;
  remarks: string;
}

export function AttendanceHistoryView({
  internId,
  internName,
  isModal = false,
  onClose,
}: AttendanceHistoryViewProps) {
  const now = new Date();
  const defaultMonth = now.toISOString().slice(0, 7); // YYYY-MM

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<MonthlyTimesheetSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);

  // Month options (current month + 5 previous months)
  const monthOptions = useMemo(() => {
    const list: { val: string; label: string }[] = [];
    const cur = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      list.push({ val, label });
    }
    return list;
  }, []);

  const fetchHistory = async (monthStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        '/api/attendance/history?internId=' +
          encodeURIComponent(internId) +
          '&month=' +
          encodeURIComponent(monthStr)
      );
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data.summary || null);
        setRecords(Array.isArray(data.records) ? data.records : []);
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      } else {
        setSummaryData(null);
        setRecords([]);
        setRequests([]);
      }
    } catch {
      setSummaryData(null);
      setRecords([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (internId) {
      fetchHistory(selectedMonth);
    }
  }, [internId, selectedMonth]);

  // Merge attendance logs and approved leave requests into unified daily logs
  const mergedLogs: MergedLogItem[] = useMemo(() => {
    const map = new Map<string, MergedLogItem>();

    // 1. Process records
    for (const r of records) {
      let mappedStatus: MergedLogItem['status'] = 'HADIR';
      let label = 'Hadir';

      if (r.status === 'LATE') {
        mappedStatus = 'TERLAMBAT';
        label = 'Terlambat';
      } else if (r.status === 'ABSENT') {
        mappedStatus = 'ALPHA';
        label = 'Alpha';
      } else if (r.status === 'ON_TIME') {
        mappedStatus = 'HADIR';
        label = 'Hadir';
      }

      const inTime = r.checkInTime ? r.checkInTime.slice(0, 5) : '--:--';
      const outTime = r.checkOutTime ? r.checkOutTime.slice(0, 5) : '--:--';

      map.set(r.date, {
        id: r.id,
        date: r.date,
        checkInTime: inTime,
        checkOutTime: outTime,
        status: mappedStatus,
        statusLabel: label,
        remarks: r.remarks || (mappedStatus === 'HADIR' ? 'Tepat waktu' : 'Terlambat masuk'),
      });
    }

    // 2. Process approved requests (Izin, Sakit, WFH)
    for (const req of requests) {
      if (req.status !== 'APPROVED') continue;

      let st: MergedLogItem['status'] = 'IZIN';
      let lbl = 'Izin';
      if (req.type === 'SAKIT') {
        st = 'SAKIT';
        lbl = 'Sakit';
      } else if (req.type === 'WFH') {
        st = 'IZIN';
        lbl = 'WFH';
      }

      if (!map.has(req.date)) {
        map.set(req.date, {
          id: req.id,
          date: req.date,
          checkInTime: '--:--',
          checkOutTime: '--:--',
          status: st,
          statusLabel: lbl,
          remarks: req.reason || 'Permohonan ' + req.type,
        });
      }
    }

    const list = Array.from(map.values());
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, requests]);

  // Filtered logs by status & search query
  const filteredLogs = useMemo(() => {
    return mergedLogs.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDate = item.date.includes(q);
        const matchRemarks = item.remarks.toLowerCase().includes(q);
        const matchStatus = item.statusLabel.toLowerCase().includes(q);
        if (!matchDate && !matchRemarks && !matchStatus) return false;
      }
      return true;
    });
  }, [mergedLogs, statusFilter, searchQuery]);

  // Summary metrics calculated from ground truth API
  const countHadir = summaryData ? (summaryData.onTimeDays || 0) : 0;
  const countTerlambat = summaryData ? (summaryData.lateDays || 0) : 0;
  const countTotalHadir = countHadir + countTerlambat;
  const countIzin = summaryData ? (summaryData.permitDays || 0) + (summaryData.wfhDays || 0) : 0;
  const countSakit = summaryData ? (summaryData.sickDays || 0) : 0;
  const countAlpha = summaryData ? (summaryData.absentDays || 0) : 0;

  const formatIndoDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: MergedLogItem['status'], label: string) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>🟢</span>
            <span>{label}</span>
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <span>🟡</span>
            <span>{label}</span>
          </span>
        );
      case 'IZIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <span>🔵</span>
            <span>{label}</span>
          </span>
        );
      case 'SAKIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
            <span>🟣</span>
            <span>{label}</span>
          </span>
        );
      case 'ALPHA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <span>🔴</span>
            <span>Alpha</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>⚪</span>
            <span>Belum Presensi</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header bar if modal */}
      {isModal && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Catatan Presensi & Logbook
            </h3>
            <p className="text-xs text-slate-500">
              Peserta: <strong className="text-slate-800">{internName}</strong>
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black cursor-pointer transition"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 1. SUMMARY CARDS (Ground Truth Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
        {/* Total Hadir */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col items-center text-center shadow-2xs">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <span>🟢</span> Total Hadir
          </span>
          <span className="text-xl font-black text-emerald-700 font-mono mt-1">
            {countTotalHadir}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5">
            {countHadir} tepat waktu
          </span>
        </div>

        {/* Terlambat */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col items-center text-center shadow-2xs">
          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <span>🟡</span> Terlambat
          </span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1">
            {countTerlambat}
          </span>
          <span className="text-[10px] text-amber-600 mt-0.5">
            toleransi lewat
          </span>
        </div>

        {/* Izin */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex flex-col items-center text-center shadow-2xs">
          <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1">
            <span>🔵</span> Izin
          </span>
          <span className="text-xl font-black text-blue-700 font-mono mt-1">
            {countIzin}
          </span>
          <span className="text-[10px] text-blue-600 mt-0.5">
            izin resmi / wfh
          </span>
        </div>

        {/* Sakit */}
        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col items-center text-center shadow-2xs">
          <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider flex items-center gap-1">
            <span>🟣</span> Sakit
          </span>
          <span className="text-xl font-black text-purple-700 font-mono mt-1">
            {countSakit}
          </span>
          <span className="text-[10px] text-purple-600 mt-0.5">
            keterangan dokter
          </span>
        </div>

        {/* Alpha */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 flex flex-col items-center text-center shadow-2xs">
          <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <span>🔴</span> Alpha
          </span>
          <span className="text-xl font-black text-rose-700 font-mono mt-1">
            {countAlpha}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5">
            tanpa keterangan
          </span>
        </div>
      </div>

      {/* 2. FILTER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-1">
          {/* Periode Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#ED0278] transition cursor-pointer"
          >
            {monthOptions.map((opt) => (
              <option key={opt.val} value={opt.val}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#ED0278] transition cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="HADIR">🟢 Hadir</option>
            <option value="TERLAMBAT">🟡 Terlambat</option>
            <option value="IZIN">🔵 Izin / WFH</option>
            <option value="SAKIT">🟣 Sakit</option>
            <option value="ALPHA">🔴 Alpha</option>
          </select>
        </div>

        {/* Search Bar & CSV Download */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari catatan/tanggal..."
              className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#ED0278] transition"
            />
            <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          <a
            href={`/api/reports/monthly-export?internId=${encodeURIComponent(internId)}&month=${encodeURIComponent(selectedMonth)}`}
            download
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-[#ED0278] text-slate-700 hover:text-white border border-slate-200 text-xs font-extrabold transition shadow-2xs whitespace-nowrap cursor-pointer"
          >
            📥 CSV
          </a>
        </div>
      </div>

      {/* 3. RIWAYAT PRESENSI: Responsive Table (Desktop) & Cards (Mobile) */}
      <div className="mt-1">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#ED0278] animate-ping" />
            <span>Memuat catatan presensi...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5">
            <span className="text-xl">📅</span>
            <span>Belum ada catatan presensi pada periode dan filter ini.</span>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jam Masuk</th>
                    <th className="py-3 px-4">Jam Pulang</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-800 font-mono">
                        {formatIndoDate(item.date)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.checkInTime}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {item.checkOutTime}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(item.status, item.statusLabel)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium italic truncate max-w-[220px]">
                        &ldquo;{item.remarks}&rdquo;
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Optimized for Mobile, No Horizontal Overflow) */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filteredLogs.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-white shadow-xs flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 font-mono">
                      {formatIndoDate(item.date)}
                    </span>
                    <div>{renderStatusBadge(item.status, item.statusLabel)}</div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100/80 font-mono">
                    <span>
                      Masuk: <strong className="text-slate-800">{item.checkInTime}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Pulang: <strong className="text-slate-800">{item.checkOutTime}</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 italic">
                    Catatan: &ldquo;{item.remarks}&rdquo;
                  </div>
                </div>
              ))}
            </div>
          </> 
        )}
      </div>
    </div>
  );
}