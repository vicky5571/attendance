'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ProfileCard } from '@/components/ProfileCard';
import { RadarCard } from '@/components/RadarCard';
import { AttendanceActions } from '@/components/AttendanceActions';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { calculateDistance, isWithinRadius } from '@/lib/client-geo';
import {
  saveAttendanceCache,
  getAttendanceCache,
  saveSelectedInternId,
  getSelectedInternId,
} from '@/lib/client-storage';
import type { OfficeConfig, InternProfile } from '@/types';

export default function AttendancePage() {
  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [interns, setInterns] = useState<InternProfile[]>([]);
  const [selectedId, setSelectedId] = useState('intern-sarah');
  const [wa, setWa] = useState<{ status: 'disconnected' | 'connecting' | 'open'; qr: string | null }>({
    status: 'disconnected',
    qr: null,
  });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);

  // GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(0);
  const [isSimulated, setIsSimulated] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [records, setRecords] = useState<{ in?: string; out?: string; remarks?: string }>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Restore remembered intern on initial mount
  useEffect(() => {
    const saved = getSelectedInternId('intern-sarah');
    if (saved) setSelectedId(saved);
  }, []);

  // Fetch initial config & intern master data
  useEffect(() => {
    Promise.all([
      fetch('/api/config').then((r) => r.json()),
      fetch('/api/interns').then((r) => r.json()),
    ]).then(([cfg, ints]) => {
      setConfig(cfg);
      setInterns(ints);
      if (cfg) {
        setCoords({ lat: cfg.targetLatitude, lng: cfg.targetLongitude });
        setDistance(0);
      }
    });
  }, []);

  // Sync attendance state on intern change (Offline-first: cache -> remote API)
  useEffect(() => {
    if (!selectedId) return;

    // 1. Instant optimistic restore from local storage cache
    const cached = getAttendanceCache(selectedId, todayStr);
    if (cached) {
      setRecords({ in: cached.in, out: cached.out, remarks: cached.remarks });
    } else {
      setRecords({});
    }

    // 2. Query ground truth from server API
    fetch(`/api/attendance/status?internId=${encodeURIComponent(selectedId)}&date=${todayStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.record) {
          const inTime = data.record.checkInTime ? data.record.checkInTime.slice(0, 5) : undefined;
          const outTime = data.record.checkOutTime ? data.record.checkOutTime.slice(0, 5) : undefined;
          const newRec = { in: inTime, out: outTime, remarks: data.record.remarks };
          setRecords(newRec);
          saveAttendanceCache(selectedId, todayStr, {
            ...newRec,
            status: data.record.status,
          });
        } else if (!cached) {
          setRecords({});
        }
      })
      .catch(() => {
        // Offline fallback: retain local cache silently
      });
  }, [selectedId, todayStr]);

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

  const maxRadius = config?.maxRadiusMeters || 50;
  const isWithin = isWithinRadius(distance, maxRadius);

  const handleSelectIntern = (id: string) => {
    setSelectedId(id);
    saveSelectedInternId(id);
  };

  const handleRealGps = () => {
    if (!navigator.geolocation) return notify('Geolocation tidak didukung browser', 'error');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsSimulated(false);
        if (config) {
          setDistance(calculateDistance(latitude, longitude, config.targetLatitude, config.targetLongitude));
        }
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
    if (!config) return;
    setCoords({ lat: config.targetLatitude, lng: config.targetLongitude });
    setDistance(0);
    setIsSimulated(true);
    notify('Simulasi: Berada tepat di titik kantor (0 m)', 'success');
  };

  const submitAttendance = async (type: 'check-in' | 'check-out') => {
    if (!coords) return notify('Koordinat GPS belum siap', 'error');
    if (!isWithin) return notify(`Di luar radius batas geofence (${maxRadius}m)`, 'error');

    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internId: selectedId, latitude: coords.lat, longitude: coords.lng }),
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const serverRemarks = data.record?.remarks || (type === 'check-in' ? 'Tepat Waktu' : records.remarks);
        const updated = type === 'check-in'
          ? { ...records, in: now, remarks: serverRemarks }
          : { ...records, out: now, remarks: serverRemarks };
        setRecords(updated);
        saveAttendanceCache(selectedId, todayStr, updated);
        notify(`Berhasil ${type === 'check-in' ? 'Check-In' : 'Check-Out'}!`, 'success');
      } else {
        notify(data.error || 'Gagal memproses presensi', 'error');
      }
    } catch {
      notify('Koneksi server gagal', 'error');
    }
    setActionLoading(false);
  };

  const activeIntern = interns.find((i) => i.id === selectedId) || interns[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : 'bg-rose-500 text-white border-rose-600'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Mobile Shell Max 440px */}
      <div className="w-full max-w-[440px] flex flex-col gap-4 pb-10">
        <Header
          internName={activeIntern?.namaLengkap || 'Intern'}
          waStatus={wa.status}
          onOpenWaModal={() => setIsWaModalOpen(true)}
        />

        <ProfileCard interns={interns} selectedId={selectedId} onSelect={handleSelectIntern} />

        <RadarCard
          distance={distance}
          maxRadius={config?.maxRadiusMeters || 50}
          isWithinRadius={isWithin}
          isSimulated={isSimulated}
          gpsLoading={gpsLoading}
          onSimulate={handleSimulate}
          onRealGps={handleRealGps}
        />

        <AttendanceActions
          isWithinRadius={isWithin}
          loading={actionLoading}
          checkInTime={records.in}
          checkOutTime={records.out}
          savedRemarks={records.remarks}
          workStartTime={config?.workStartTime}
          workEndTime={config?.workEndTime}
          onCheckIn={() => submitAttendance('check-in')}
          onCheckOut={() => submitAttendance('check-out')}
        />

        {/* Footer */}
        <footer className="text-center pt-2 text-[11px] text-slate-400 font-medium">
          Indosat Ooredoo Hutchison &bull; IAC Attendance Program
        </footer>
      </div>

      <WhatsAppModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        status={wa.status}
        qr={wa.qr}
        onConnect={() => fetch('/api/whatsapp/connect', { method: 'POST' })}
      />
    </div>
  );
}
