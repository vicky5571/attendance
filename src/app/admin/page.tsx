'use client';

import { VerificationManager } from '@/components/admin/VerificationManager';

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
  const [internFilter, setInternFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
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

  // Mentor assignment modal state
  const [editingMentorIntern, setEditingMentorIntern] = useState<InternProfile | null>(null);
  const [mentorForm, setMentorForm] = useState({ namaMentor: '', emailMentor: '' });
  const [savingMentor, setSavingMentor] = useState(false);

  const openMentorModal = (intern: InternProfile) => {
    setEditingMentorIntern(intern);
    setMentorForm({
      namaMentor: intern.namaMentor === 'Belum Ditugaskan' ? '' : intern.namaMentor || '',
      emailMentor: intern.emailMentor || '',
    });
  };

  const handleSaveMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMentorIntern) return;
    setSavingMentor(true);
    try {
      const res = await fetch('/api/interns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: editingMentorIntern.id,
          namaMentor: mentorForm.namaMentor.trim(),
          emailMentor: mentorForm.emailMentor.trim(),
        }),
      });

      if (res.ok) {
        notify('Mentor pembimbing berhasil ditugaskan!', 'success');
        setEditingMentorIntern(null);
        fetchInterns();
      } else {
        const data = await res.json().catch(() => null);
        notify(data?.error || 'Gagal menyimpan data mentor', 'error');
      }
    } catch {
      notify('Koneksi server gagal', 'error');
    } finally {
      setSavingMentor(false);
    }
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
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.locations) ? data.locations : Array.isArray(data) ? data : [];
        setLocations(list);
      }
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
        if (data.email?.sent === 0 && data.email?.errors?.length > 0) {
          notify(`Peringatan Email: ${data.email.errors[0]}`, 'error');
        } else {
          notify(
            `Rekap harian berhasil disiarkan! WA: ${data.whatsapp?.sent || 0}, Email: ${data.email?.sent || 0}`,
            'success'
          );
        }
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

  const unassignedInterns = interns.filter(
    (i) => !i.namaMentor || i.namaMentor === 'Belum Ditugaskan'
  );
  const assignedInterns = interns.filter(
    (i) => i.namaMentor && i.namaMentor !== 'Belum Ditugaskan'
  );

  const displayedInterns =
    internFilter === 'UNASSIGNED'
      ? unassignedInterns
      : internFilter === 'ASSIGNED'
      ? assignedInterns
      : interns;



  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Toast Notification (Highest z-index to float over modal backdrops) */}
      {toast && (
        <div
          className={`fixed top-5 z-[9999] px-5 py-3 rounded-2xl text-xs font-black shadow-2xl transition-all animate-bounce border max-w-[90vw] text-center ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30'
              : 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
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
            <img
              src="/icons/logo.png"
              alt="Indosat Ooredoo Hutchison"
              className="h-9 sm:h-10 w-auto object-contain shrink-0"
            />
            <div className="border-l border-slate-200 pl-3">
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

        {/* Action Alert Banner for Unassigned Interns */}
        {unassignedInterns.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950">
                  {unassignedInterns.length} Peserta Magang Belum Memiliki Mentor
                </h4>
                <p className="text-[11px] font-semibold text-amber-800/80">
                  Tugaskan nama &amp; email mentor pembimbing agar pengingat absensi &amp; laporan harian dapat dikirimkan otomatis.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInternFilter('UNASSIGNED');
                const el = document.getElementById('interns-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Lihat &amp; Tugaskan ({unassignedInterns.length})</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Peserta Magang
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">{interns.length}</span>
              {unassignedInterns.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setInternFilter('UNASSIGNED');
                    const el = document.getElementById('interns-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[10px] font-black text-amber-700 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full hover:bg-amber-200 transition cursor-pointer"
                >
                  {unassignedInterns.length} Butuh Mentor
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Semua Lengkap
                </span>
              )}
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
        <VerificationManager
          interns={interns}
          adminName={user?.name || 'Administrator'}
          onActionComplete={() => {
            fetchRequests();
            fetchInterns();
          }}
        />

        {/* Section 2: Interns List & Timesheet CSV */}
        <div id="interns-section" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Daftar Peserta Magang &amp; Timesheet Logbook
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau rekapan bulanan, tugaskan mentor, dan unduh laporan resmi CSV (format standar IOH IAC)
              </p>
            </div>

            {/* Quick Filter Tabs for Mentor Status */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setInternFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  internFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Semua ({interns.length})
              </button>
              <button
                type="button"
                onClick={() => setInternFilter('UNASSIGNED')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                  internFilter === 'UNASSIGNED'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : unassignedInterns.length > 0
                    ? 'text-amber-800 bg-amber-100/70 hover:bg-amber-200/70'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>Butuh Mentor</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    internFilter === 'UNASSIGNED'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {unassignedInterns.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInternFilter('ASSIGNED')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                  internFilter === 'ASSIGNED'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sudah Ada ({assignedInterns.length})
              </button>
            </div>
          </div>

          {displayedInterns.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-2xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-700">
                {internFilter === 'UNASSIGNED'
                  ? 'Luar biasa! Semua peserta magang sudah memiliki mentor pembimbing.'
                  : 'Tidak ada data peserta magang pada filter ini.'}
              </p>
              {internFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setInternFilter('ALL')}
                  className="mt-2 text-xs font-extrabold text-[#ED0278] hover:underline cursor-pointer"
                >
                  Tampilkan Semua Peserta
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedInterns.map((intern) => (
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

                  {/* Mentor Assignment Ribbon */}
                  <div className="bg-slate-100/70 p-2.5 rounded-xl flex items-center justify-between text-[11px] gap-2">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Mentor Pembimbing
                      </span>
                      <span className="font-bold text-slate-800 truncate text-[11px]">
                        {intern.namaMentor && intern.namaMentor !== 'Belum Ditugaskan' ? (
                          intern.namaMentor
                        ) : (
                          <span className="text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded text-[10px] font-extrabold">
                            Belum Ditugaskan
                          </span>
                        )}
                      </span>
                      {intern.emailMentor && (
                        <span className="text-[10px] text-slate-400 truncate">
                          {intern.emailMentor}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openMentorModal(intern)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#ED0278] hover:text-[#ED0278] text-slate-700 font-extrabold text-[10px] transition shadow-2xs cursor-pointer shrink-0"
                    >
                      {intern.namaMentor && intern.namaMentor !== 'Belum Ditugaskan' ? 'Ubah' : 'Tugaskan'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectIntern(intern)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:border-[#ED0278] text-slate-700 font-extrabold text-[11px] transition shadow-2xs text-center cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span>Detail Logbook</span>
                    </button>

                    <a
                      href={`/api/reports/monthly-export?internId=${encodeURIComponent(intern.id)}&month=${currentMonthStr}`}
                      download
                      className="flex-1 py-1.5 px-2 rounded-xl bg-[#ED0278] hover:bg-[#d6026c] text-white font-extrabold text-[11px] transition shadow-2xs text-center cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      <span>Unduh CSV</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Daily Broadcast Engine & Geofencing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Daily Broadcast Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                </div>
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
                <div className="w-7 h-7 rounded-lg bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Multi-Hub Kantor & Geofence
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Titik presensi terdaftar dalam sistem IOH Multi-Hub
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {Array.isArray(locations) && locations.map((loc) => (
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

      {/* Assign Mentor Modal */}
      {editingMentorIntern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ED0278] animate-pulse" />
                <h3 className="text-sm font-black text-slate-900">
                  Tugaskan Mentor Pembimbing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMentorIntern(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Peserta Magang:</p>
              <p className="text-xs font-black text-slate-900 mt-0.5">{editingMentorIntern.namaLengkap}</p>
              <p className="text-[10px] text-slate-500 font-semibold">{editingMentorIntern.divisi}</p>
            </div>

            <form onSubmit={handleSaveMentor} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600">
                  Nama Mentor / Pembimbing <span className="text-pink-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mentorForm.namaMentor}
                  onChange={(e) => setMentorForm((p) => ({ ...p, namaMentor: e.target.value }))}
                  placeholder="cth. Bambang Supriyanto"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-[11px] font-bold text-slate-600">
                  Email Mentor <span className="text-pink-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={mentorForm.emailMentor}
                  onChange={(e) => setMentorForm((p) => ({ ...p, emailMentor: e.target.value }))}
                  placeholder="cth. bambang.mentor@indosat.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
                />
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Email ini akan otomatis menerima broadcast rekap harian khusus absensi mentees bimbingannya.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMentorIntern(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMentor}
                  className="flex-1 py-2 rounded-xl bg-[#ED0278] hover:bg-[#d6026c] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingMentor ? 'Menyimpan...' : 'Simpan Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
