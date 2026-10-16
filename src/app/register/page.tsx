'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OfficeLocation } from '@/types';
import { validateRegistrationForm, getFriendlyRegistrationError } from '@/lib/registration-helpers';
import { InternFormFields } from '@/components/register/InternFormFields';
import { BiometricCameraCapture } from '@/components/register/BiometricCameraCapture';
import { RegistrationSuccessCard } from '@/components/register/RegistrationSuccessCard';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    namaLengkap: '',
    email: '',
    password: '',
    divisi: '',
    namaMentor: '',
    emailMentor: '',
    universitas: '',
    jurusan: '',
    periodeMagangSelesai: '',
    assignedLocationId: 'loc-kppti',
  });

  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    namaLengkap: string;
    email: string;
    photoUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/config/locations?active=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: OfficeLocation[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.locations)
          ? data.locations
          : [];
        if (list.length > 0) {
          setLocations(list);
          setFormData((prev) => ({ ...prev, assignedLocationId: list[0].id }));
        }
      })
      .catch(() => {
        setLocations([
          {
            id: 'loc-kppti',
            name: 'KPPTI Jakarta Pusat (HQ)',
            latitude: -6.180495,
            longitude: 106.822769,
            maxRadiusMeters: 50,
            isActive: true,
          },
          {
            id: 'loc-bsd',
            name: 'Gedung Indosat Serpong BSD',
            latitude: -6.30154,
            longitude: 106.65217,
            maxRadiusMeters: 75,
            isActive: true,
          },
        ]);
      });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateRegistrationForm({
      ...formData,
      facePhoto: facePhoto || '',
    });

    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, facePhoto }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(getFriendlyRegistrationError(res.status, data.error));
        setSubmitting(false);
        return;
      }

      setSuccessData({
        namaLengkap: data.intern.namaLengkap,
        email: data.intern.email,
        photoUrl: data.intern.photoUrl,
      });
      setSubmitting(false);
    } catch {
      setErrorMessage(getFriendlyRegistrationError(0));
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <RegistrationSuccessCard
          namaLengkap={successData.namaLengkap}
          email={successData.email}
          photoUrl={successData.photoUrl}
          onNavigateToLogin={() => router.push('/login')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col">
        {/* Navigation & Header */}
        <div className="flex items-center mb-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#ED0278] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Kembali ke Login</span>
          </Link>
        </div>

        <div className="flex flex-col items-center text-center mb-6">
          <img src="/icons/logo.png" alt="IOH" className="h-10 sm:h-11 w-auto object-contain mb-3" />
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Pendaftaran Peserta Magang</h1>
          <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm">
            Lengkapi data profil dan rekam foto biometrik wajah sebagai referensi presensi.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
            <svg className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Section 1 & 2: Form Inputs */}
          <InternFormFields
            formData={formData}
            locations={locations}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onInputChange={handleInputChange}
          />

          {/* Section 3: Biometrik Wajah */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#ED0278] flex items-center justify-center font-bold text-xs">3</div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Verifikasi Biometrik Wajah</h2>
              </div>
              <span className="text-[10px] font-bold text-pink-600">Wajib Ada</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Foto wajah ini akan disimpan sebagai referensi biometrik AI untuk verifikasi presensi harian.
            </p>
            <BiometricCameraCapture
              facePhoto={facePhoto}
              onPhotoCaptured={(photo) => setFacePhoto(photo)}
              onPhotoReset={() => setFacePhoto(null)}
              onError={(err) => setErrorMessage(err)}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ED0278] to-[#FF4500] hover:from-[#c40062] hover:to-[#e03d00] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black tracking-wide shadow-lg shadow-pink-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memvalidasi Biometrik &amp; Menyimpan Akun...</span>
              </>
            ) : (
              <>
                <span>Daftarkan Akun Magang</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            🔒 Dilindungi Enkripsi Password scrypt, PIN sha256 &amp; Biometric Anti-Spoofing
          </p>
        </div>
      </div>
    </div>
  );
}
