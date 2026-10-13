'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  getLatestRelocationRequest,
  submitRelocationRequest,
  getCurrentOfficeForIntern,
  type RelocationRequest,
} from '@/lib/services/relocation-service';
import type { OfficeLocation, InternProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [internProfile, setInternProfile] = useState<InternProfile | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [currentOfficeName, setCurrentOfficeName] = useState<string>('KPPTI Jakarta Pusat (HQ)');

  const [latestRequest, setLatestRequest] = useState<RelocationRequest | null>(null);
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoadingData(true);
      try {
        const resInterns = await fetch('/api/interns');
        if (resInterns.ok) {
          const internsList: InternProfile[] = await resInterns.json();
          const match = internsList.find((i) => i.id === user.id) || internsList[0];
          setInternProfile(match || null);
        }

        const resLocs = await fetch('/api/config/locations');
        if (resLocs.ok) {
          const locsData = await resLocs.json();
          const list: OfficeLocation[] = Array.isArray(locsData)
            ? locsData
            : Array.isArray(locsData?.locations)
            ? locsData.locations
            : [];
          setLocations(list);
        }

        const office = getCurrentOfficeForIntern(user.id, 'KPPTI Jakarta Pusat (HQ)');
        setCurrentOfficeName(office);

        const req = await getLatestRelocationRequest(user.id);
        setLatestRequest(req);
      } catch {
        notify('Gagal memuat data profil', 'error');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user]);

  const handleSubmitRelocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormError('');

    const targetLoc = locations.find((l) => l.id === targetLocationId);
    if (!targetLoc) {
      setFormError('Silakan pilih kantor tujuan.');
      return;
    }

    if (targetLoc.name.toLowerCase() === currentOfficeName.toLowerCase()) {
      setFormError('Kantor tujuan tidak boleh sama dengan kantor penempatan saat ini.');
      return;
    }

    if (!reason.trim()) {
      setFormError('Alasan pindah kantor wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitRelocationRequest({
        internId: user.id,
        internName: internProfile?.namaLengkap || user.name,
        internEmail: user.email || internProfile?.emailMentor,
        currentOfficeId: 'loc-current',
        currentOfficeName: currentOfficeName,
        targetOfficeId: targetLoc.id,
        targetOfficeName: targetLoc.name,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      if (result.success && result.request) {
        setLatestRequest(result.request);
        setTargetLocationId('');
        setReason('');
        setNotes('');
        notify('Pengajuan pindah kantor berhasil dikirim! Menunggu persetujuan admin.', 'success');
      } else {
        setFormError(result.error || 'Gagal mengajukan perpindahan kantor.');
      }
    } catch {
      setFormError('Terjadi kesalahan koneksi saat mengirim pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ED0278] animate-ping" />
          <span className="text-xs font-bold text-slate-500">Memuat profil magang...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const displayName = internProfile?.namaLengkap || user.name;
  const displayDivision = internProfile?.divisi || user.divisi || 'Digital Transformation';
  const displayStatus = internProfile?.status || 'ACTIVE';
  const displayId = internProfile?.id || user.id;
  const displayUniversity = internProfile?.universitas || 'Universitas Indonesia';
  const displayMajor = internProfile?.jurusan || 'Teknologi Informasi';
  const displayPeriod = internProfile?.periodeMagangSelesai || '2026-12-31';
  const displayMentor = internProfile?.namaMentor || 'Bambang Supriyanto';
  const displayMentorEmail = internProfile?.emailMentor || 'mentor.vicky@indosat.com';
  const displayEmail = user.email || `${displayId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@intern.ioh.co.id`;
  const displayPhone = '0812-3456-7890';

  const isPending = latestRequest?.status === 'PENDING';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center p-3 sm:p-6 font-sans">
      {toast && (
        <div
          className={`fixed top-4 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all animate-bounce border ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-400'
              : 'bg-rose-500 text-white border-rose-400'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="w-full max-w-lg flex flex-col gap-4 pb-12">
        <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-extrabold text-slate-700 hover:text-[#ED0278] transition px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-[#ED0278] shadow-2xs"
          >
            <span>←</span>
            <span>Kembali ke Absensi</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#ED0278]/10 text-[#ED0278] text-[10px] font-black tracking-wide uppercase">
              Profil Magang
            </span>
          </div>
        </div>

        {/* 1. Header Card: Foto + Nama + Status / Posisi */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left relative overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-pink-500/20 shrink-0">
            {displayName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-lg font-black text-slate-900 tracking-tight truncate">
                {displayName}
              </h1>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  displayStatus === 'ACTIVE'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200'
                }`}
              >
                ● {displayStatus === 'ACTIVE' ? 'Aktif' : 'Selesai'}
              </span>
            </div>
            <p className="text-xs font-bold text-[#ED0278]">{displayDivision}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayUniversity} &bull; {displayMajor}
            </p>
          </div>
        </div>

        {/* 2. Informasi Pribadi Card */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-base">👤</span>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Informasi Pribadi
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nama Lengkap
              </span>
              <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                {displayName}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Email
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block truncate font-mono text-[11px]">
                {displayEmail}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nomor HP / WhatsApp
              </span>
              <span className="font-extrabold text-slate-800 mt-0.5 block font-mono">
                {displayPhone}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ID / NIM Peserta
              </span>
              <span className="font-black text-[#ED0278] mt-0.5 block font-mono">
                {displayId}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Informasi Magang Card */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="text-base">🏢</span>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Informasi Magang
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Posisi / Divisi
              </span>
              <span className="font-extrabold text-slate-800 mt-0.5 block">
                {displayDivision}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Kantor Penempatan
              </span>
              <span className="font-extrabold text-[#ED0278] mt-0.5 block">
                {currentOfficeName}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Periode Magang
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                Aktif s/d <strong>{displayPeriod}</strong>
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Mentor Pembimbing
              </span>
              <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                {displayMentor}
              </span>
              <span className="text-[10px] text-slate-400 truncate block">
                {displayMentorEmail}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Section: Pengajuan Pindah Kantor */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Pengajuan Pindah Kantor
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ajukan perubahan lokasi kantor penempatan kerja magang Anda
                </p>
              </div>
            </div>
          </div>

          {/* Status Pengajuan Aktif */}
          {latestRequest && (
            <div
              className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                latestRequest.status === 'PENDING'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : latestRequest.status === 'APPROVED'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {latestRequest.status === 'PENDING'
                      ? '🟡'
                      : latestRequest.status === 'APPROVED'
                      ? '🟢'
                      : '🔴'}
                  </span>
                  <span className="text-xs font-black">
                    {latestRequest.status === 'PENDING'
                      ? 'Menunggu Persetujuan'
                      : latestRequest.status === 'APPROVED'
                      ? 'Disetujui'
                      : 'Ditolak'}
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-75">
                  {new Date(latestRequest.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <p className="text-xs">
                {latestRequest.status === 'PENDING' && (
                  <span>Pengajuan pindah kantor kamu sedang menunggu verifikasi admin.</span>
                )}
                {latestRequest.status === 'APPROVED' && (
                  <span>
                    Pengajuan pindah kantor telah disetujui. Kantor penempatan baru Anda:{' '}
                    <strong>{latestRequest.targetOfficeName}</strong>.
                  </span>
                )}
                {latestRequest.status === 'REJECTED' && (
                  <span>
                    Pengajuan pindah kantor ditolak.{' '}
                    {latestRequest.rejectionReason && (
                      <span className="italic block mt-1 font-semibold">
                        Alasan penolakan: &ldquo;{latestRequest.rejectionReason}&rdquo;
                      </span>
                    )}
                  </span>
                )}
              </p>

              <div className="text-[11px] pt-1.5 border-t border-current/15 flex items-center justify-between opacity-90">
                <span>
                  Tujuan: <strong>{latestRequest.targetOfficeName}</strong>
                </span>
                <span className="truncate max-w-[200px] italic">
                  &ldquo;{latestRequest.reason}&rdquo;
                </span>
              </div>
            </div>
          )}

          {/* Form Pengajuan */}
          <form onSubmit={handleSubmitRelocation} className="flex flex-col gap-3.5">
            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Kantor Saat Ini
              </label>
              <input
                type="text"
                value={currentOfficeName}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Kantor Tujuan <span className="text-[#ED0278]">*</span>
              </label>
              <select
                value={targetLocationId}
                onChange={(e) => {
                  setTargetLocationId(e.target.value);
                  setFormError('');
                }}
                disabled={isPending || submitting}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#ED0278] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Pilih Kantor Tujuan --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.name.toLowerCase() === currentOfficeName.toLowerCase() ? '(Kantor Sekarang)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Alasan Pindah <span className="text-[#ED0278]">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFormError('');
                }}
                disabled={isPending || submitting}
                placeholder="Jelaskan alasan perpindahan (misal: penugasan proyek baru, efisiensi transportasi, domisili)..."
                required
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#ED0278] transition resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Catatan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isPending || submitting}
                placeholder="Contoh: Sudah konfirmasi dengan mentor terkait"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#ED0278] transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || submitting}
              className="w-full py-3.5 px-6 rounded-full bg-[#ED0278] hover:bg-[#D0026B] active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : isPending ? (
                <span>Pengajuan Sebelumnya Masih Menunggu Verifikasi</span>
              ) : (
                <span>Ajukan Pindah Kantor</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}