'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { HistoryModal } from '@/components/HistoryModal';
import type { AttendanceRequest, InternProfile, OfficeLocation } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // State
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [reqFilter, setReqFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // WhatsApp state
  const [wa, setWa] = useState<{ status: 'disconnected' | 'connecting' | 'open'; qr: string | null }>({
    status: 'disconnected',
    qr: null,
  });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // Modal inspection for an intern
  const [inspectIntern, setInspectIntern] = useState<InternProfile | null>(null);

  // Daily Recap state
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapDate, setRecapDate] = useState('');
  const [currentMonthStr, setCurrentMonthStr] = useState('');
  const [recapData, setRecapData] = useState<any>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setRecapDate(today);
    setCurrentMonthStr(today.slice(0, 7));
  }, []);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Route Authentication Guard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push('/login');
      } else if (user.role === 'INTERN') {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Data fetching
  const fetchInterns = async () => {
    try {
      const res = await fetch('/api/interns');
      if (res.ok) setInterns(await res.json());
    } catch {}
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/attendance/requests');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
        setRequests(list);
      }
    } catch {}
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/config/locations');
      if (res.ok) setLocations(await res.json());
    } catch {}
  };

  const fetchRecap = async (date: string) => {
    try {
      const res = await fetch(`/api/reports/daily-recap?date=${date}`);
      if (res.ok) setRecapData(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPERVISOR')) {
      fetchInterns();
      fetchRequests();
      fetchLocations();
      if (recapDate) fetchRecap(recapDate);
    }
  }, [isAuthenticated, user?.role]);

  // WA polling
  useEffect(() => {
    const pollWa = () =>
      fetch('/api/whatsapp/status')
        .then((r) => r.json())
        .then(setWa)
        .catch(() => {});
    pollWa();
    const interval = setInterval(pollWa, 6000);
    return () => clearInterval(interval);
  }, []);

  // Request review action
  const handleReviewRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/attendance/requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: user?.name || 'Mentor Supervisor',
        }),
      });
      if (res.ok) {
        notify(`Permohonan berhasil di-${status === 'APPROVED' ? 'setujui' : 'tolak'}`, 'success');
        fetchRequests();
      } else {
        notify('Gagal memperbarui permohonan', 'error');
      }
    } catch {
      notify('Koneksi server gagal', 'error');
    }
    setActionLoadingId(null);
  };

  // Broadcast Daily Recap
  const handleBroadcastRecap = async () => {
    setRecapLoading(true);
    try {
      const res = await fetch('/api/reports/daily-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: recapDate,
          sendWhatsApp: true,
          sendEmail: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Rekap harian berhasil disiarkan! WA: ${data.whatsapp?.sent || 0}, Email: ${data.email?.sent || 0}`, 'success');
        fetchRecap(recapDate);
      } else {
        notify(data.error || 'Gagal menyiarkan rekap', 'error');
      }
    } catch {
      notify('Koneksi gagal', 'error');
    }
    setRecapLoading(false);
  };

  const handleConnectWa = async () => {
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
      notify('Menghubungkan sesi WhatsApp...', 'success');
    } catch {
      notify('Gagal menghubungkan WhatsApp', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#ED0278] animate-ping" />
          <span className="text-xs font-bold text-slate-500">Memeriksa izin administrator...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role === 'INTERN') {
    return null;
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const filteredRequests =
    reqFilter === 'ALL' ? requests : requests.filter((r) => r.status === reqFilter);



  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Toast Notification */}
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

      {/* Main Container */}
      <div className="w-full max-w-4xl flex flex-col gap-5">
        {/* Top Header Card */}
        <header className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="38" cy="45" r="28" fill="#FFC72C" opacity="0.9" />
                <circle cx="62" cy="42" r="26" fill="#ED1C24" opacity="0.85" />
                <circle cx="50" cy="62" r="28" fill="#ED0278" opacity="0.9" />
                <circle cx="68" cy="60" r="20" fill="#7C2582" opacity="0.75" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">
                  Dashboard Mentor & Supervisor
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Indosat Ooredoo Hutchison &bull; {user.name} ({user.id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Presensi Page button */}
            <a
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#ED0278] hover:text-[#ED0278] transition shadow-2xs"
            >
              <span>Presensi Magang</span>
              <span>➔</span>
            </a>

            {/* WA Modal button */}
            <button
              type="button"
              onClick={() => setIsWaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:border-[#ED0278] transition shadow-2xs cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wa.status === 'open' ? 'bg-emerald-500' : wa.status === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>{wa.status === 'open' ? 'WA Aktif' : wa.status === 'connecting' ? 'Scan WA' : 'WA Offline'}</span>
            </button>

            {/* Logout button */}
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-extrabold hover:bg-rose-100 transition shadow-2xs cursor-pointer"
            >
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Peserta Magang
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{interns.length}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Semua Aktif
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Permohonan Pending
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-[#ED0278]">{pendingRequests.length}</span>
              {pendingRequests.length > 0 && (
                <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse">
                  Butuh Tindakan
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Kantor & Hub
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{locations.length || 3}</span>
              <span className="text-xs font-bold text-slate-500">Geofence</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Bot Broadcast WA
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs font-black text-slate-800">
                {wa.status === 'open' ? 'Siap Kirim' : 'Perlu QR'}
              </span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  wa.status === 'open' ? 'bg-emerald-500' : 'bg-rose-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Section 1: Approval Center */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Pusat Persetujuan Izin, Sakit & WFH
                </h2>
                {pendingRequests.length > 0 && (
                  <span className="bg-[#ED0278] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {pendingRequests.length} Baru
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifikasi dan putuskan pengajuan absensi fleksibel peserta magang
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setReqFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                    reqFilter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'PENDING' ? 'Menunggu' : tab === 'APPROVED' ? 'Disetujui' : tab === 'REJECTED' ? 'Ditolak' : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada permohonan dengan status &ldquo;{reqFilter}&rdquo;
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        {interns.find((i) => i.id === req.internId)?.namaLengkap || req.internId}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        req.type === 'WFH'
                          ? 'bg-blue-100 text-blue-700'
                          : req.type === 'SAKIT'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {req.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'PENDING'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        ● {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <strong>Tanggal:</strong> {req.date}
                    </div>
                    <div className="text-xs text-slate-500 italic">
                      &ldquo;{req.reason}&rdquo;
                    </div>
                    {req.reviewedBy && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ditinjau oleh: {req.reviewedBy}
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        ✓ Setujui
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-extrabold text-xs transition border border-rose-200 cursor-pointer disabled:opacity-50"
                      >
                        ✕ Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Interns List & Timesheet CSV */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Daftar Peserta Magang & Timesheet Logbook
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau rekapan bulanan dan unduh laporan resmi CSV (format standar IOH IAC)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {interns.map((intern) => (
              <div
                key={intern.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-base shadow-xs shrink-0">
                    {intern.namaLengkap.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 truncate">
                      {intern.namaLengkap}
                    </h3>
                    <p className="text-[11px] font-bold text-[#ED0278] truncate">
                      {intern.divisi}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {intern.universitas} &bull; {intern.jurusan}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectIntern(intern)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-[#ED0278] text-slate-700 font-extrabold text-[11px] transition shadow-2xs text-center cursor-pointer"
                  >
                    📊 Detail Logbook
                  </button>

                  <a
                    href={`/api/reports/monthly-export?internId=${encodeURIComponent(intern.id)}&month=${currentMonthStr}`}
                    download
                    className="flex-1 py-1.5 px-2 rounded-xl bg-[#ED0278] hover:bg-[#d6026c] text-white font-extrabold text-[11px] transition shadow-2xs text-center cursor-pointer"
                  >
                    📥 Unduh CSV
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Daily Broadcast Engine & Geofencing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Broadcast Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📢</span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Broadcast Laporan Harian
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Kirim rekap absensi harian ke WhatsApp Group & Email Atasan
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={recapDate}
                onChange={(e) => {
                  setRecapDate(e.target.value);
                  fetchRecap(e.target.value);
                }}
                className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none flex-1"
              />
              <button
                type="button"
                disabled={recapLoading}
                onClick={handleBroadcastRecap}
                className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {recapLoading ? 'Mengirim...' : 'Siarkan Sekarang'}
              </button>
            </div>

            {recapData && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex flex-col gap-1">
                <div className="font-extrabold text-slate-700">Ringkasan {recapDate}:</div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Hadir Tepat Waktu: <strong>{recapData.presentOnTimeCount || 0}</strong></span>
                  <span>Terlambat: <strong>{recapData.lateCount || 0}</strong></span>
                  <span>WFH / Izin: <strong>{(recapData.wfhCount || 0) + (recapData.leaveCount || 0)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Office Hub Geofencing Overview */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">📍</span>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Multi-Hub Kantor & Geofence
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Titik presensi terdaftar dalam sistem IOH Multi-Hub
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{loc.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#ED0278] bg-[#ED0278]/10 px-2 py-0.5 rounded-full">
                    Radius {loc.maxRadiusMeters}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        status={wa.status}
        qr={wa.qr}
        onConnect={handleConnectWa}
      />

      {/* Intern Detail Timesheet Modal */}
      {inspectIntern && (
        <HistoryModal
          isOpen={true}
          onClose={() => setInspectIntern(null)}
          internId={inspectIntern.id}
          internName={inspectIntern.namaLengkap}
        />
      )}
    </div>
  );
}
