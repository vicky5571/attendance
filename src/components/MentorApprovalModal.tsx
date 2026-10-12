'use client';

import React, { useState, useEffect } from 'react';
import type { AttendanceRequest, InternProfile } from '@/types';

interface MentorApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  interns: InternProfile[];
  onActionComplete: () => void;
}

export function MentorApprovalModal({
  isOpen,
  onClose,
  interns,
  onActionComplete,
}: MentorApprovalModalProps) {
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/attendance/requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: 'Mentor Supervisor',
        }),
      });
      if (res.ok) {
        fetchRequests();
        onActionComplete();
      }
    } catch {
      // ignore
    }
    setActionLoadingId(null);
  };

  if (!isOpen) return null;

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const getInternName = (internId: string) => {
    return interns.find((i) => i.id === internId)?.namaLengkap || internId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Dashboard Persetujuan Mentor
            </h3>
            <p className="text-xs text-slate-500">
              Verifikasi permohonan WFH, Sakit, & Izin anak magang
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 my-4 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer text-[11px] ${
                filter === f
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'PENDING'
                ? 'Menunggu'
                : f === 'APPROVED'
                ? 'Disetujui'
                : f === 'REJECTED'
                ? 'Ditolak'
                : 'Semua'}
            </button>
          ))}
        </div>

        {/* List of Requests */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Memuat daftar permohonan...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada permohonan dengan status ini.
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-2 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {getInternName(req.internId)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {req.date} &bull; Tipe: <strong className="text-[#ED0278]">{req.type}</strong>
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
                      ? '✓ Approved'
                      : req.status === 'REJECTED'
                      ? '✕ Rejected'
                      : '⏳ Pending'}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 italic">
                  "{req.reason}"
                </div>

                {/* Action Buttons if Pending */}
                {req.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50">
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleReview(req.id, 'REJECTED')}
                      className="px-4 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleReview(req.id, 'APPROVED')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
                    >
                      Setujui (Approve)
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
