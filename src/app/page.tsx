'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { ProfileCard } from '@/components/ProfileCard';
import { RadarCard } from '@/components/RadarCard';
import { AttendanceActions } from '@/components/AttendanceActions';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { PinModal } from '@/components/PinModal';
import { RequestModal } from '@/components/RequestModal';
import { HistoryModal } from '@/components/HistoryModal';
import { MentorApprovalModal } from '@/components/MentorApprovalModal';
import { calculateDistance, isWithinRadius } from '@/lib/client-geo';
import {
  saveAttendanceCache,
  getAttendanceCache,
} from '@/lib/client-storage';
import type { OfficeConfig, InternProfile, OfficeLocation } from '@/types';

export default function AttendancePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('loc-kppti');

  const [wa, setWa] = useState<{ status: 'disconnected' | 'connecting' | 'open'; qr: string | null }>({
    status: 'disconnected',
    qr: null,
  });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // Modals state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState<'check-in' | 'check-out' | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Route Authentication Guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch pending approvals count (if admin / mentor)
  const fetchPendingCount = () => {
    fetch('/api/attendance/requests?status=PENDING')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.requests) ? data.requests : Array.isArray(data) ? data : [];
        setPendingApprovalsCount(list.length);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(0);
  const [isSimulated, setIsSimulated] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [records, setRecords] = useState<{ in?: string; out?: string; remarks?: string }>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [todayStr, setTodayStr] = useState<string>('');

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Determine active intern ID (Locked to authenticated user)
  const currentInternId = user?.id || 'intern-sarah';

  // Fetch initial config, locations, & intern master data
  useEffect(() => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/interns').then((r) => r.json()),
      fetch('/api/config/locations').then((r) => (r.ok ? r.json() : [])),
    ]).then(([cfg, ints, locs]) => {
      setConfig(cfg);
      setInterns(ints);
      if (Array.isArray(locs) && locs.length > 0) {
        setLocations(locs);
        setSelectedLocationId(locs[0].id);
        setCoords({ lat: locs[0].latitude, lng: locs[0].longitude });
        setDistance(0);
      } else if (cfg) {
        setCoords({ lat: cfg.targetLatitude, lng: cfg.targetLongitude });
        setDistance(0);
      }
    });
  }, []);

  // Sync attendance state on authenticated intern
  const syncAttendanceStatus = () => {
    if (!currentInternId) return;
    const today = new Date().toISOString().split('T')[0];
    setTodayStr(today);

    // 1. Instant optimistic restore from local storage cache
    const cached = getAttendanceCache(currentInternId, today);
    if (cached) {
      setRecords({ in: cached.in, out: cached.out, remarks: cached.remarks });
    } else {
      setRecords({});
    }

    // 2. Query ground truth from server API
    fetch(`/api/attendance/status?internId=${encodeURIComponent(currentInternId)}&date=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.record) {
          const inTime = data.record.checkInTime ? data.record.checkInTime.slice(0, 5) : undefined;
          const outTime = data.record.checkOutTime ? data.record.checkOutTime.slice(0, 5) : undefined;
          const newRec = { in: inTime, out: outTime, remarks: data.record.remarks };
          setRecords(newRec);
          saveAttendanceCache(currentInternId, today, {
            ...newRec,
            status: data.record.status,
          });
        } else if (!cached) {
          setRecords({});
        }
      })
      .catch(() => {
        // Offline fallback
      });
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      syncAttendanceStatus();
    }
  }, [isAuthenticated, user?.id]);

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

  // Geofence target calculation
  const activeLocation = locations.find((l) => l.id === selectedLocationId);
  const targetLat = activeLocation ? activeLocation.latitude : config?.targetLatitude ?? -6.1822;
  const targetLng = activeLocation ? activeLocation.longitude : config?.targetLongitude ?? 106.8228;
  const maxRadius = activeLocation ? activeLocation.maxRadiusMeters : config?.maxRadiusMeters ?? 100;

  const isWithin = distance !== null ? isWithinRadius(distance, maxRadius) : false;

  const handleLocationChange = (newLocationId: string) => {
    setSelectedLocationId(newLocationId);
    const loc = locations.find((l) => l.id === newLocationId);
    if (loc) {
      if (isSimulated) {
        setCoords({ lat: loc.latitude, lng: loc.longitude });
        setDistance(0);
      } else if (coords) {
        const d = calculateDistance(coords.lat, coords.lng, loc.latitude, loc.longitude);
        setDistance(d);
      }
    }
  };

  const handleSimulate = () => {
    setIsSimulated(true);
    setCoords({ lat: targetLat, lng: targetLng });
    setDistance(0);
    notify('Mode Simulasi KPPTI: Berada di dalam radius kantor', 'success');
  };

  const handleRealGps = () => {
    if (!navigator.geolocation) {
      notify('Geolocation tidak didukung oleh browser Anda', 'error');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsSimulated(false);
        const d = calculateDistance(latitude, longitude, targetLat, targetLng);
        setDistance(d);
        setGpsLoading(false);
        notify(`GPS Aktif: Berjarak ${d}m dari ${activeLocation?.name || 'Kantor'}`, 'success');
      },
      () => {
        setGpsLoading(false);
        notify('Gagal membaca lokasi GPS fisik perangkat', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const initiateAttendance = (type: 'check-in' | 'check-out') => {
    if (!coords) return notify('Koordinat GPS belum siap', 'error');
    if (!isWithin) return notify(`Di luar radius batas geofence (${maxRadius}m)`, 'error');
    setPendingActionType(type);
    setPinModalOpen(true);
  };

  // Submit check-in or check-out with verified PIN for the authenticated intern
  const executeAttendanceWithPin = async (pin: string): Promise<boolean> => {
    if (!coords || !pendingActionType) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/${pendingActionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: currentInternId,
          latitude: coords.lat,
          longitude: coords.lng,
          pin,
          locationId: selectedLocationId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const serverRemarks = data.record?.remarks || (pendingActionType === 'check-in' ? 'Tepat Waktu' : records.remarks);
        const updated = pendingActionType === 'check-in'
          ? { ...records, in: now, remarks: serverRemarks }
          : { ...records, out: now, remarks: serverRemarks };
        setRecords(updated);
        const currentDate = todayStr || new Date().toISOString().split('T')[0];
        saveAttendanceCache(currentInternId, currentDate, updated);
        notify(`Berhasil ${pendingActionType === 'check-in' ? 'Check-In' : 'Check-Out'}!`, 'success');
        setPinModalOpen(false);
        setPendingActionType(null);
        setActionLoading(false);
        return true;
      } else {
        setActionLoading(false);
        return false;
      }
    } catch {
      notify('Koneksi server gagal', 'error');
      setActionLoading(false);
      return false;
    }
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
          <span className="text-xs font-bold text-slate-500">Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const activeIntern = interns.find((i) => i.id === currentInternId) || {
    id: user.id,
    namaLengkap: user.name,
    divisi: user.divisi || 'Digital Transformation',
    universitas: 'Universitas Indonesia',
    jurusan: 'Teknologi Informasi',
    namaMentor: 'Bambang Supriyanto',
    emailMentor: 'bambang.mentor@ioh.co.id',
    periodeMagangSelesai: '2026-12-31',
    status: 'ACTIVE' as const,
  };

  const isSupervisorOrAdmin = user.role === 'ADMIN' || user.role === 'SUPERVISOR';

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

      {/* Main Container Wrapper */}
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Header App with Session Badge & Logout */}
        <Header
          internName={activeIntern?.namaLengkap || user.name}
          waStatus={wa.status}
          onOpenWaModal={() => setIsWaModalOpen(true)}
        />

        {/* Enterprise Quick-Action Toolbar */}
        <div className={`grid ${isSupervisorOrAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center group"
          >
            <svg className="w-4 h-4 mb-1 text-slate-600 group-hover:text-[#ED0278] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
              Izin / WFH
            </span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center group"
          >
            <svg className="w-4 h-4 mb-1 text-slate-600 group-hover:text-[#ED0278] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
              Timesheet &amp; CSV
            </span>
          </button>

          {isSupervisorOrAdmin && (
            <button
              type="button"
              onClick={() => setApprovalModalOpen(true)}
              className="relative flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center group"
            >
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1.5 -right-1 bg-[#ED0278] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                  {pendingApprovalsCount}
                </span>
              )}
              <svg className="w-4 h-4 mb-1 text-slate-600 group-hover:text-[#ED0278] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
                Persetujuan Mentor
              </span>
            </button>
          )}
        </div>

        {/* Locked Profile Card (Impersonation Prevented) */}
        <ProfileCard
          interns={interns}
          selectedId={currentInternId}
          locked={true}
        />

        {/* Radar Geofence Card with Multi-Hub Locations */}
        <RadarCard
          distance={distance}
          maxRadius={maxRadius}
          isWithinRadius={isWithin}
          isSimulated={isSimulated}
          gpsLoading={gpsLoading}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onLocationChange={handleLocationChange}
          onSimulate={handleSimulate}
          onRealGps={handleRealGps}
        />

        {/* Actions Button */}
        <AttendanceActions
          isWithinRadius={isWithin}
          loading={actionLoading}
          checkInTime={records.in}
          checkOutTime={records.out}
          savedRemarks={records.remarks}
          workStartTime={config?.workStartTime}
          workEndTime={config?.workEndTime}
          onCheckIn={() => initiateAttendance('check-in')}
          onCheckOut={() => initiateAttendance('check-out')}
        />
      </div>

      {/* WhatsApp QR Modal */}
      <WhatsAppModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        status={wa.status}
        qr={wa.qr}
        onConnect={handleConnectWa}
      />

      {/* PIN Anti-Proxy Verification Modal */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingActionType(null);
        }}
        onSubmit={executeAttendanceWithPin}
        actionType={pendingActionType || 'check-in'}
        internName={activeIntern?.namaLengkap || 'Peserta'}
      />

      {/* Leave & Remote Request Modal */}
      <RequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        internId={currentInternId}
        internName={activeIntern?.namaLengkap || 'Peserta'}
        onSuccess={() => {
          notify('Pengajuan berhasil dikirim ke mentor', 'success');
          fetchPendingCount();
        }}
      />

      {/* Timesheet History & Logbook CSV Export Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        internId={currentInternId}
        internName={activeIntern?.namaLengkap || 'Peserta'}
      />

      {/* Mentor Approval Dashboard Modal */}
      {isSupervisorOrAdmin && (
        <MentorApprovalModal
          isOpen={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          interns={interns}
          onActionComplete={() => {
            notify('Status permohonan berhasil diperbarui', 'success');
            syncAttendanceStatus();
            fetchPendingCount();
          }}
        />
      )}
    </div>
  );
}
