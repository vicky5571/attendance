'use client';

import React, { useState, useEffect } from 'react';
import type { AttendanceRequest, LeaveType } from '@/types';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  internId: string;
  internName: string;
  onSuccess: () => void;
}

const LEAVE_TYPES: { type: LeaveType; label: string; desc: string; badgeClass: string }[] = [
  { type: 'WFH', label: 'Work From Home (WFH)', desc: 'Kerja remote dari rumah', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'SAKIT', label: 'Sakit (Medical)', desc: 'Tidak dapat bekerja karena sakit', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'IZIN', label: 'Izin Keperluan Pribadi', desc: 'Izin urusan kampus / mendesak', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'DISPENSASI', label: 'Dispensasi Akademik', desc: 'Ujian / bimbingan skripsi / magang', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'OFF_SITE', label: 'Tugas Luar / Off-Site', desc: 'Dinas / visit lapangan', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export function RequestModal({
  isOpen,
  onClose,
  internId,
  internName,
  onSuccess,
}: RequestModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [date, setDate] = useState('');
  const [type, setType] = useState<LeaveType>('WFH');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setReason('');
      setErrorMsg('');
      fetchRequests();
    }
  }, [isOpen, internId]);

  const fetchRequests = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/attendance/requests?internId=${encodeURIComponent(internId)}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // ignore
    }
    setLoadingHistory(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Alasan pengajuan wajib diisi');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/attendance/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId,
          date,
          type,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
        fetchRequests();
        setActiveTab('history');
      } else {
        setErrorMsg(data.error || 'Gagal mengajukan permohonan');
      }
    } catch {
      setErrorMsg('Koneksi server gagal');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Pengajuan Izin & Remote
            </h3>
            <p className="text-xs text-slate-500">
              Peserta: <strong className="text-slate-800">{internName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl my-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'form'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ✍️ Buat Pengajuan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              fetchRequests();
            }}
            className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Riwayat ({requests.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Tanggal Berlaku
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition"
                />
              </div>

              {/* Jenis Izin */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Tipe Permohonan
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {LEAVE_TYPES.map((lt) => {
                    const isSelected = type === lt.type;
                    return (
                      <label
                        key={lt.type}
                        onClick={() => setType(lt.type)}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-[#ED0278] bg-[#ED0278]/5 shadow-xs'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="leaveType"
                            checked={isSelected}
                            onChange={() => setType(lt.type)}
                            className="accent-[#ED0278]"
                          />
                          <div>
                            <div className="text-xs font-extrabold text-slate-800">
                              {lt.label}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {lt.desc}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Alasan */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Keterangan / Alasan Permohonan
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Mengikuti jadwal ujian skripsi kampus..."
                  required
                  className="w-full p-3 text-xs border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#ED0278] hover:bg-[#D0026B] active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan ke Mentor'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-2.5">
              {loadingHistory ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Memuat riwayat...
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Belum ada permohonan yang diajukan.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 font-mono">
                          {req.date}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {req.type}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {req.status === 'APPROVED'
                          ? '✓ Disetujui'
                          : req.status === 'REJECTED'
                          ? '✕ Ditolak'
                          : '⏳ Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic">"{req.reason}"</p>
                    {req.reviewedBy && (
                      <div className="text-[10px] text-slate-400">
                        Direview oleh: <strong>{req.reviewedBy}</strong>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
