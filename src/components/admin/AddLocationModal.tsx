'use client';

import React, { useState } from 'react';
import { parseGoogleMapsUrl } from '@/lib/gmaps-parser';

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_OFFICES = [
  {
    name: 'Indosat Surabaya Regional Hub',
    address: 'Jl. Kayoon No. 42, Genteng, Surabaya, Jawa Timur',
    lat: -7.2654,
    lng: 112.7512,
    radius: 60,
  },
  {
    name: 'Indosat Bandung Regional Hub',
    address: 'Jl. Asia Afrika No. 141, Kb. Pisang, Bandung, Jawa Barat',
    lat: -6.9175,
    lng: 107.6191,
    radius: 60,
  },
  {
    name: 'Indosat Medan Regional Hub',
    address: 'Jl. Perintis Kemerdekaan No. 39, Medan, Sumatera Utara',
    lat: 3.5952,
    lng: 98.6722,
    radius: 60,
  },
  {
    name: 'Indosat Semarang Regional Hub',
    address: 'Jl. Pandanaran No. 131, Mugassari, Semarang, Jawa Tengah',
    lat: -6.9932,
    lng: 110.4203,
    radius: 60,
  },
];

export function AddLocationModal({ isOpen, onClose, onSuccess }: AddLocationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [maxRadiusMeters, setMaxRadiusMeters] = useState(50);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Google Maps link parser state
  const [gmapsInput, setGmapsInput] = useState('');
  const [parsingGmaps, setParsingGmaps] = useState(false);
  const [gmapsSuccessMsg, setGmapsSuccessMsg] = useState('');

  if (!isOpen) return null;

  const applyParsedCoordinates = (lat: number, lng: number, placeName?: string) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    if (placeName && !name.trim()) {
      setName(placeName);
    }
    setGmapsSuccessMsg(
      placeName ? `Koordinat & nama "${placeName}" berhasil diambil!` : 'Koordinat berhasil diekstrak!'
    );
    setErrorMsg('');
  };

  const handleExtractGmaps = async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setErrorMsg('Silakan masukkan link Google Maps atau koordinat terlebih dahulu.');
      return;
    }

    setParsingGmaps(true);
    setErrorMsg('');
    setGmapsSuccessMsg('');

    // 1. Direct synchronous extraction first
    const direct = parseGoogleMapsUrl(trimmed);
    if (direct) {
      applyParsedCoordinates(direct.latitude, direct.longitude, direct.placeName);
      setParsingGmaps(false);
      return;
    }

    // 2. Fetch server API to follow short URL redirects (e.g. maps.app.goo.gl)
    try {
      const res = await fetch('/api/config/locations/parse-gmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengekstrak koordinat dari link Google Maps.');
      }
      applyParsedCoordinates(data.latitude, data.longitude, data.placeName);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat membaca link.');
    } finally {
      setParsingGmaps(false);
    }
  };

  const handleGmapsInputChange = (val: string) => {
    setGmapsInput(val);
    setGmapsSuccessMsg('');
    const direct = parseGoogleMapsUrl(val.trim());
    if (direct) {
      applyParsedCoordinates(direct.latitude, direct.longitude, direct.placeName);
    }
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browser Anda tidak mendukung Geolocation API.');
      return;
    }
    setDetectingGps(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setDetectingGps(false);
      },
      (err) => {
        setErrorMsg(`Gagal mendeteksi lokasi GPS: ${err.message}`);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleApplyPreset = (preset: typeof PRESET_OFFICES[0]) => {
    setName(preset.name);
    setAddress(preset.address);
    setLatitude(preset.lat.toString());
    setLongitude(preset.lng.toString());
    setMaxRadiusMeters(preset.radius);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (!name.trim()) {
      setErrorMsg('Nama kantor atau site kerja wajib diisi.');
      return;
    }

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg('Latitude harus berupa angka valid antara -90 dan 90.');
      return;
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setErrorMsg('Longitude harus berupa angka valid antara -180 dan 180.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/config/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
          latitude: latNum,
          longitude: lngNum,
          maxRadiusMeters: Number(maxRadiusMeters) || 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan lokasi kantor');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Pendaftaran Kantor / Hub Baru
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Superadmin Multi-Hub Geofencing Configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {errorMsg && (
            <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Preset Selector */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              Preset Kantor Regional IOH:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_OFFICES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-[#ED0278] hover:bg-pink-50/20 text-left transition cursor-pointer text-[10px] flex flex-col"
                >
                  <span className="font-extrabold text-slate-800 truncate">{preset.name}</span>
                  <span className="text-slate-400 font-medium truncate">{preset.address.split(',')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nama Kantor */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Nama Kantor / Site Kerja <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Gedung Indosat Medan Regional"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">
              Alamat Lengkap
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Perintis Kemerdekaan No. 39, Medan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
            />
          </div>

          {/* Google Maps Link Extractor Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#ED0278]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Link Google Maps</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400">Ekstrak Lat & Long Otomatis</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={gmapsInput}
                onChange={(e) => handleGmapsInputChange(e.target.value)}
                placeholder="Tempel link Google Maps (contoh: https://maps.app.goo.gl/...)"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:border-[#ED0278] transition"
              />
              <button
                type="button"
                disabled={parsingGmaps || !gmapsInput.trim()}
                onClick={() => handleExtractGmaps(gmapsInput)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs transition disabled:opacity-40 cursor-pointer shrink-0"
              >
                {parsingGmaps ? 'Mengekstrak...' : 'Ekstrak'}
              </button>
            </div>
            {gmapsSuccessMsg && (
              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{gmapsSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* GPS Coordinates Header & Auto-Detect Button */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-700">
              Koordinat GPS & Geofence <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              disabled={detectingGps}
              onClick={handleGetCurrentGps}
              className="text-[11px] font-extrabold text-[#ED0278] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{detectingGps ? 'Mendeteksi...' : 'Gunakan GPS Perangkat'}</span>
            </button>
          </div>

          {/* Latitude & Longitude Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Latitude (Lintang)</span>
              <input
                type="text"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-6.180495"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-400 mb-0.5">Longitude (Bujur)</span>
              <input
                type="text"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="106.822769"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono font-semibold focus:outline-none focus:border-[#ED0278] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Max Radius Slider / Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-700">
                Radius Geofencing Presensi
              </label>
              <span className="text-xs font-black text-[#ED0278] bg-pink-50 px-2 py-0.5 rounded-md">
                {maxRadiusMeters} Meter
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={maxRadiusMeters}
              onChange={(e) => setMaxRadiusMeters(Number(e.target.value))}
              className="w-full accent-[#ED0278] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
              <span>20m (Sangat Ketat)</span>
              <span>Default (50m-75m)</span>
              <span>250m (Kampus/Site Luas)</span>
            </div>
          </div>

          {/* Submit CTA */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-2xl bg-[#ED0278] hover:bg-[#d0026b] active:scale-95 text-white font-extrabold text-xs transition shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Daftarkan Lokasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
