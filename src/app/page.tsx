'use client';

import React, { useState, useEffect } from 'react';
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
  saveSelectedInternId,
  getSelectedInternId,
} from '@/lib/client-storage';
import type { OfficeConfig, InternProfile, OfficeLocation } from '@/types';

export default function AttendancePage() {
  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [selectedId, setSelectedId] = useState('intern-sarah');
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

  // Restore remembered intern on initial mount
  useEffect(() => {
    const saved = getSelectedInternId('intern-sarah');
    if (saved) setSelectedId(saved);
  }, []);

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

  // Sync attendance state on intern change (Offline-first: cache -> remote API)
  const syncAttendanceStatus = () => {
    if (!selectedId) return;
    const today = new Date().toISOString().split('T')[0];
    setTodayStr(today);

    // 1. Instant optimistic restore from local storage cache
    const cached = getAttendanceCache(selectedId, today);
    if (cached) {
      setRecords({ in: cached.in, out: cached.out, remarks: cached.remarks });
    } else {
      setRecords({});
    }

    // 2. Query ground truth from server API
    fetch(`/api/attendance/status?internId=${encodeURIComponent(selectedId)}&date=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.record) {
          const inTime = data.record.checkInTime ? data.record.checkInTime.slice(0, 5) : undefined;
          const outTime = data.record.checkOutTime ? data.record.checkOutTime.slice(0, 5) : undefined;
          const newRec = { in: inTime, out: outTime, remarks: data.record.remarks };
          setRecords(newRec);
          saveAttendanceCache(selectedId, today, {
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
    syncAttendanceStatus();
  }, [selectedId]);

  useEffect(() => {
    const pollWa = () =>
      fetch('/api/whatsapp/status')
        .then((r) => r.json())
        .then(setWa)
        .catch(() => {});
    pollWa();
    const interval = setInterval(pollWa, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeLocation = locations.find((l) => l.id === selectedLocationId);
  const targetLat = activeLocation?.latitude ?? config?.targetLatitude ?? -6.180495;
  const targetLng = activeLocation?.longitude ?? config?.targetLongitude ?? 106.822769;
  const maxRadius = activeLocation?.maxRadiusMeters ?? config?.maxRadiusMeters ?? 50;
  const isWithin = isWithinRadius(distance, maxRadius);

  const handleSelectIntern = (id: string) => {
    setSelectedId(id);
    saveSelectedInternId(id);
  };

  const handleLocationChange = (locId: string) => {
    setSelectedLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    if (loc && isSimulated) {
      setCoords({ lat: loc.latitude, lng: loc.longitude });
      setDistance(0);
      notify(`Lokasi kerja diubah ke: ${loc.name}`, 'success');
    } else if (loc && coords) {
      const d = calculateDistance(coords.lat, coords.lng, loc.latitude, loc.longitude);
      setDistance(d);
    }
  };

  const handleRealGps = () => {
    if (!navigator.geolocation) return notify('Geolocation tidak didukung browser', 'error');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsSimulated(false);
        setDistance(calculateDistance(latitude, longitude, targetLat, targetLng));
        setGpsLoading(false);
        notify('Titik GPS asli terdeteksi', 'success');
      },
      (err) => {
        setGpsLoading(false);
        notify(`Gagal GPS: ${err.message}`, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulate = () => {
    setCoords({ lat: targetLat, lng: targetLng });
    setDistance(0);
    setIsSimulated(true);
    notify(`Simulasi: Berada tepat di titik kantor (0 m)`, 'success');
  };

  // Trigger PIN Modal before submitting
  const initiateAttendance = (type: 'check-in' | 'check-out') => {
    if (!coords) return notify('Koordinat GPS belum siap', 'error');
    if (!isWithin) return notify(`Di luar radius batas geofence (${maxRadius}m)`, 'error');
    setPendingActionType(type);
    setPinModalOpen(true);
  };

  // Submit check-in or check-out with verified PIN
  const executeAttendanceWithPin = async (pin: string): Promise<boolean> => {
    if (!coords || !pendingActionType) return false;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/${pendingActionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: selectedId,
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
        saveAttendanceCache(selectedId, currentDate, updated);
        notify(`Berhasil ${pendingActionType === 'check-in' ? 'Check-In' : 'Check-Out'}!`, 'success');
        setPinModalOpen(false);
        setPendingActionType(null);
        setActionLoading(false);
        return true;
      } else {
        // Return false to trigger PIN shake
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

  const activeIntern = interns.find((i) => i.id === selectedId) || interns[0];

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
        {/* Header App */}
        <Header
          internName={activeIntern?.namaLengkap || 'Peserta Magang'}
          waStatus={wa.status}
          onOpenWaModal={() => setIsWaModalOpen(true)}
        />

        {/* Enterprise Quick-Action Toolbar */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center"
          >
            <span className="text-base mb-0.5">✍️</span>
            <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
              Izin / WFH
            </span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center"
          >
            <span className="text-base mb-0.5">📊</span>
            <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
              Timesheet & CSV
            </span>
          </button>

          <button
            type="button"
            onClick={() => setApprovalModalOpen(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-xs hover:border-[#ED0278] hover:bg-[#ED0278]/5 transition cursor-pointer active:scale-95 text-center"
          >
            <span className="text-base mb-0.5">🛡️</span>
            <span className="text-[10px] font-extrabold text-slate-700 leading-tight">
              Persetujuan Mentor
            </span>
          </button>
        </div>

        {/* Profile Card */}
        <ProfileCard
          interns={interns}
          selectedId={selectedId}
          onSelect={handleSelectIntern}
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
        internId={selectedId}
        internName={activeIntern?.namaLengkap || 'Peserta'}
        onSuccess={() => {
          notify('Pengajuan berhasil dikirim ke mentor', 'success');
        }}
      />

      {/* Timesheet History & Logbook CSV Export Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        internId={selectedId}
        internName={activeIntern?.namaLengkap || 'Peserta'}
      />

      {/* Mentor Approval Dashboard Modal */}
      <MentorApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        interns={interns}
        onActionComplete={() => {
          notify('Status permohonan berhasil diperbarui', 'success');
          syncAttendanceStatus();
        }}
      />
    </div>
  );
}
