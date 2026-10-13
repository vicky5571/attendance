'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { AttendanceRequest, InternProfile } from '@/types';
import {
  getRelocationRequests,
  reviewRelocationRequest,
  type RelocationRequest,
} from '@/lib/services/relocation-service';

export interface UnifiedVerificationItem {
  id: string;
  source: 'RELOCATION' | 'ATTENDANCE';
  internId: string;
  internName: string;
  internEmail?: string;
  title: string;
  subTitle: string;
  currentOffice?: string;
  targetOffice?: string;
  typeBadge: string;
  date: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  rawAttendance?: AttendanceRequest;
  rawRelocation?: RelocationRequest;
}

interface VerificationManagerProps {
  interns: InternProfile[];
  adminName: string;
  onActionComplete?: () => void;
}

export function VerificationManager({
  interns,
  adminName,
  onActionComplete,
}: VerificationManagerProps) {
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [relocationRequests, setRelocationRequests] = useState<RelocationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const [selectedItem, setSelectedItem] = useState<UnifiedVerificationItem | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT';
    rejectionReason: string;
  }>({
    isOpen: false,
    type: 'APPROVE',
    rejectionReason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const [resAtt, relocList] = await Promise.all([
        fetch('/api/attendance/requests').then((r) => (r.ok ? r.json() : null)),
        getRelocationRequests(),
      ]);

      const attList = Array.isArray(resAtt?.requests)
        ? resAtt.requests
        : Array.isArray(resAtt)
        ? resAtt
        : [];
      setAttendanceRequests(attList);
      setRelocationRequests(relocList);
    } catch {
      notify('Gagal menyinkronkan data pengajuan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const unifiedItems: UnifiedVerificationItem[] = useMemo(() => {
    const list: UnifiedVerificationItem[] = [];

    for (const r of relocationRequests) {
      const intern = interns.find((i) => i.id === r.internId);
      list.push({
        id: r.id,
        source: 'RELOCATION',
        internId: r.internId,
        internName: r.internName || intern?.namaLengkap || r.internId,
        internEmail: r.internEmail || intern?.emailMentor,
        title: 'Pengajuan Pindah Kantor',
        subTitle: r.currentOfficeName + ' ➔ ' + r.targetOfficeName,
        currentOffice: r.currentOfficeName,
        targetOffice: r.targetOfficeName,
        typeBadge: 'Pindah Kantor',
        date: r.createdAt.slice(0, 10),
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewedAt: r.reviewedAt,
        rejectionReason: r.rejectionReason,
        rawRelocation: r,
      });
    }

    for (const a of attendanceRequests) {
      const intern = interns.find((i) => i.id === a.internId);
      list.push({
        id: a.id,
        source: 'ATTENDANCE',
        internId: a.internId,
        internName: intern?.namaLengkap || a.internId,
        internEmail: intern?.emailMentor,
        title: 'Izin Presensi (' + a.type + ')',
        subTitle: 'Permohonan ' + a.type + ' • Tanggal: ' + a.date,
        typeBadge: a.type,
        date: a.date,
        reason: a.reason,
        status: a.status,
        reviewedBy: a.reviewedBy || undefined,
        reviewedAt: a.reviewedAt || undefined,
        rawAttendance: a,
      });
    }

    return list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [attendanceRequests, relocationRequests, interns]);

  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.internName.toLowerCase().includes(q);
        const matchSubtitle = item.subTitle.toLowerCase().includes(q);
        const matchReason = item.reason.toLowerCase().includes(q);
        const matchId = item.internId.toLowerCase().includes(q);
        if (!matchName && !matchSubtitle && !matchReason && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedItems, statusFilter, searchQuery]);

  const pendingCount = unifiedItems.filter((i) => i.status === 'PENDING').length;
  const approvedCount = unifiedItems.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = unifiedItems.filter((i) => i.status === 'REJECTED').length;

  const handleExecuteReview = async () => {
    if (!selectedItem) return;
    setActionLoading(true);

    const isApprove = confirmDialog.type === 'APPROVE';
    const newStatus = isApprove ? 'APPROVED' : 'REJECTED';

    try {
      if (selectedItem.source === 'RELOCATION') {
        const res = await reviewRelocationRequest(
          selectedItem.id,
          newStatus,
          adminName,
          confirmDialog.rejectionReason.trim() || undefined
        );
        if (res.success) {
          notify(
            'Pengajuan pindah kantor berhasil di-' + (isApprove ? 'setujui' : 'tolak') + '!',
            'success'
          );
        } else {
          notify(res.error || 'Gagal memproses pengajuan', 'error');
        }
      } else {
        const res = await fetch('/api/attendance/requests/' + encodeURIComponent(selectedItem.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            reviewedBy: adminName,
          }),
        });
        if (res.ok) {
          notify(
            'Permohonan presensi berhasil di-' + (isApprove ? 'setujui' : 'tolak') + '!',
            'success'
          );
        } else {
          notify('Gagal memperbarui status permohonan presensi', 'error');
        }
      }

      await fetchAllRequests();
      if (onActionComplete) onActionComplete();

      setConfirmDialog({ isOpen: false, type: 'APPROVE', rejectionReason: '' });
      setSelectedItem(null);
    } catch {
      notify('Terjadi kesalahan jaringan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-5">
      {toastMsg && (
        <div
          className={`fixed top-4 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all animate-bounce border ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-400'
              : 'bg-rose-500 text-white border-rose-400'
          }`}
        >
          {toastMsg.text}
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Verifikasi
            </h2>
            {pendingCount > 0 && (
              <span className="bg-[#ED0278] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                {pendingCount} Menunggu
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola dan verifikasi pengajuan peserta magang.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAllRequests}
          disabled={loading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#ED0278] hover:border-[#ED0278] text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          <span>{loading ? 'Menyinkronkan...' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari peserta, kantor, atau alasan..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#ED0278] transition"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-extrabold overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-[11px] whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({unifiedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-[11px] whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Menunggu ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-[11px] whitespace-nowrap ${
              statusFilter === 'APPROVED'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Disetujui ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer text-[11px] whitespace-nowrap ${
              statusFilter === 'REJECTED'
                ? 'bg-white text-rose-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ditolak ({rejectedCount})
          </button>
        </div>
      </div>

      {/* 3. Request Card List (Hanya Informasi Utama) */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1.5">
          <span className="text-xl">📭</span>
          <span>Tidak ada pengajuan yang sesuai dengan kriteria filter.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-sm shadow-2xs shrink-0">
                  {item.internName.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {item.internName}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        item.source === 'RELOCATION'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {item.typeBadge}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        item.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {item.status === 'PENDING'
                        ? '● Menunggu'
                        : item.status === 'APPROVED'
                        ? '✓ Disetujui'
                        : '✕ Ditolak'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
                    {item.subTitle}
                  </p>

                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Tanggal Pengajuan: {item.date}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#ED0278] hover:text-[#ED0278] text-slate-700 text-xs font-extrabold transition shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <span>Lihat Detail</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Detail Verification Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Detail Verifikasi Pengajuan
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      selectedItem.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : selectedItem.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {selectedItem.status === 'PENDING'
                      ? 'Menunggu Verifikasi'
                      : selectedItem.status === 'APPROVED'
                      ? 'Telah Disetujui'
                      : 'Telah Ditolak'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tinjau rincian pengajuan sebelum mengambil keputusan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 text-xs pr-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Data Peserta Magang
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Nama:</span>
                    <strong className="text-slate-800 text-xs">{selectedItem.internName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">ID / NIM:</span>
                    <strong className="text-[#ED0278] font-mono text-xs">{selectedItem.internId}</strong>
                  </div>
                  {selectedItem.internEmail && (
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[11px] block">Email Kontak:</span>
                      <span className="text-slate-700 font-mono text-[11px]">{selectedItem.internEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Rincian Pengajuan
                </span>

                {selectedItem.source === 'RELOCATION' ? (
                  <div className="flex flex-col gap-2">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">KANTOR ASAL</span>
                        <strong className="text-slate-800">{selectedItem.currentOffice}</strong>
                      </div>
                      <span className="text-slate-400 font-black text-sm">➔</span>
                      <div className="text-right">
                        <span className="text-[10px] text-[#ED0278] block font-bold">KANTOR TUJUAN</span>
                        <strong className="text-[#ED0278]">{selectedItem.targetOffice}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">JENIS PERMOHONAN</span>
                      <strong className="text-slate-800">{selectedItem.title}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">TANGGAL</span>
                      <strong className="text-slate-800 font-mono">{selectedItem.date}</strong>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 text-[11px] block">Tanggal Pengajuan:</span>
                  <span className="text-slate-700 font-mono">{selectedItem.date}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block font-semibold">Alasan Pengajuan:</span>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 mt-1 italic">
                    &ldquo;{selectedItem.reason}&rdquo;
                  </div>
                </div>

                {selectedItem.notes && (
                  <div>
                    <span className="text-slate-400 text-[11px] block font-semibold">Catatan Tambahan:</span>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 mt-1">
                      {selectedItem.notes}
                    </div>
                  </div>
                )}

                {selectedItem.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <span className="text-[10px] font-bold uppercase block text-rose-600">Alasan Penolakan:</span>
                    &ldquo;{selectedItem.rejectionReason}&rdquo;
                  </div>
                )}

                {selectedItem.reviewedBy && (
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex items-center justify-between">
                    <span>Ditinjau oleh: <strong>{selectedItem.reviewedBy}</strong></span>
                    {selectedItem.reviewedAt && (
                      <span className="font-mono">{new Date(selectedItem.reviewedAt).toLocaleDateString('id-ID')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              {selectedItem.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: 'REJECT',
                        rejectionReason: '',
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition border border-rose-200 cursor-pointer active:scale-95"
                  >
                    ✕ Tolak Pengajuan
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        type: 'APPROVE',
                        rejectionReason: '',
                      })
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-xs cursor-pointer active:scale-95"
                  >
                    ✓ Setujui Pengajuan
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs transition hover:bg-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Confirmation Dialog */}
      {confirmDialog.isOpen && selectedItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">
                {confirmDialog.type === 'APPROVE'
                  ? 'Setujui pengajuan peserta?'
                  : 'Tolak pengajuan peserta?'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {confirmDialog.type === 'APPROVE'
                  ? 'Pengajuan akan diteruskan dan status peserta magang akan diperbarui secara otomatis.'
                  : 'Permohonan akan ditandai ditolak. Anda dapat memberikan alasan penolakan di bawah.'}
              </p>
            </div>

            {confirmDialog.type === 'REJECT' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Alasan Penolakan <span className="text-slate-400 font-normal">(opsional)</span>:
                </label>
                <textarea
                  rows={2}
                  value={confirmDialog.rejectionReason}
                  onChange={(e) =>
                    setConfirmDialog({ ...confirmDialog, rejectionReason: e.target.value })
                  }
                  placeholder="Contoh: Kuota kantor tujuan penuh atau jadwal belum memungkinkan..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-rose-500 transition resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  setConfirmDialog({ isOpen: false, type: 'APPROVE', rejectionReason: '' })
                }
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteReview}
                className={`px-4 py-2 rounded-xl text-white font-extrabold text-xs transition shadow-xs cursor-pointer active:scale-95 ${
                  confirmDialog.type === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? 'Memproses...' : confirmDialog.type === 'APPROVE' ? 'Ya, Setujui' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}