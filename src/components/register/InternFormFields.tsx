'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { OfficeLocation } from '@/types';

export interface InternFormFieldsProps {
  formData: {
    namaLengkap: string;
    email: string;
    password: string;
    pin: string;
    divisi: string;
    namaMentor: string;
    emailMentor: string;
    universitas: string;
    jurusan: string;
    periodeMagangSelesai: string;
    assignedLocationId: string;
  };
  locations: OfficeLocation[];
  showPassword: boolean;
  onTogglePassword: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function InternFormFields({
  formData,
  locations,
  showPassword,
  onTogglePassword,
  onInputChange,
}: InternFormFieldsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const selectedLocation =
    locations.find((l) => l.id === formData.assignedLocationId) || locations[0];

  const handleSelectLocation = (locId: string) => {
    onInputChange({
      target: { name: 'assignedLocationId', value: locId },
    } as any);
    setIsDropdownOpen(false);
  };
  return (
    <>
      {/* Section 1: Akun & Kredensial */}
      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
          <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#ED0278] flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Akun &amp; Kredensial Masuk
          </h2>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[11px] font-bold text-slate-600">
            Nama Lengkap <span className="text-pink-600">*</span>
          </label>
          <input
            type="text"
            name="namaLengkap"
            required
            value={formData.namaLengkap}
            onChange={onInputChange}
            placeholder="cth. Dimas Wicaksono"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
          />
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[11px] font-bold text-slate-600">
            Alamat Email <span className="text-pink-600">*</span>
          </label>
          <input
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={onInputChange}
            placeholder="cth. dimas.wicaksono@ioh.co.id"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              Password <span className="text-pink-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={onInputChange}
                placeholder="Min. 6 karakter"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      showPassword
                        ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18'
                        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                    }
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              PIN Presensi (6 Digit) <span className="text-pink-600">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              name="pin"
              maxLength={6}
              required
              value={formData.pin}
              onChange={onInputChange}
              placeholder="6 Digit Angka"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all tracking-widest shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Data Magang & Penugasan */}
      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3.5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
          <div className="w-6 h-6 rounded-lg bg-pink-100 text-[#ED0278] flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Data Magang &amp; Penugasan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              Asal Kampus / Universitas <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              name="universitas"
              required
              value={formData.universitas}
              onChange={onInputChange}
              placeholder="cth. ITB"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
            />
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              Jurusan / Program Studi <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              name="jurusan"
              required
              value={formData.jurusan}
              onChange={onInputChange}
              placeholder="cth. Informatika"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-left col-span-1 sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-600">
              Divisi Kerja <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              name="divisi"
              required
              value={formData.divisi}
              onChange={onInputChange}
              placeholder="cth. Cloud Infrastructure"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
            />
          </div>

          {/* Hub / Kantor Penempatan - 2 Colspan directly below Divisi Kerja */}
          <div className="flex flex-col gap-1 text-left relative col-span-1 sm:col-span-2" ref={dropdownRef}>
            <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>
                Hub / Kantor Penempatan <span className="text-pink-600">*</span>
              </span>
              {selectedLocation && (
                <span className="text-[10px] text-slate-400 font-semibold">
                  Radius {selectedLocation.maxRadiusMeters}m
                </span>
              )}
            </label>

            {/* Custom Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full px-3.5 py-2 rounded-xl border bg-white text-slate-900 text-xs font-semibold flex items-center justify-between transition-all shadow-xs cursor-pointer ${
                isDropdownOpen
                  ? 'border-[#ED0278] ring-2 ring-pink-500/10'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 pr-2">
                <div className="w-5 h-5 rounded-lg bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0 mt-0.5 self-start">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div className="flex flex-col text-left flex-1">
                  <span className="font-bold text-slate-900 text-xs leading-snug">
                    {selectedLocation ? selectedLocation.name : 'Pilih Lokasi Kantor'}
                  </span>
                  {selectedLocation?.address && (
                    <span className="text-[10px] text-slate-400 font-normal leading-normal mt-0.5">
                      {selectedLocation.address}
                    </span>
                  )}
                </div>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 self-center ${
                  isDropdownOpen ? 'rotate-180 text-[#ED0278]' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Custom Dropdown Options Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 max-h-60 overflow-y-auto flex flex-col gap-1">
                {locations.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 font-medium">
                    Tidak ada lokasi kantor tersedia.
                  </div>
                ) : (
                  locations.map((loc) => {
                    const isSelected = loc.id === formData.assignedLocationId;
                    return (
                      <div
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc.id)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-pink-50/60 border border-pink-200/80 text-slate-900'
                            : 'hover:bg-slate-50 border border-transparent text-slate-700'
                        }`}
                      >
                        <div className="flex flex-col flex-1 pr-1 text-left">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-extrabold text-xs text-slate-900 leading-snug">
                              {loc.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 shrink-0">
                              Radius {loc.maxRadiusMeters}m
                            </span>
                          </div>
                          {loc.address && (
                            <span className="text-[10px] text-slate-500 font-normal leading-normal mt-0.5">
                              {loc.address}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#ED0278] text-white flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              Nama Mentor / Pembimbing <span className="text-pink-600">*</span>
            </label>
            <input
              type="text"
              name="namaMentor"
              required
              value={formData.namaMentor}
              onChange={onInputChange}
              placeholder="cth. Vicky Backend Lead"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
            />
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-[11px] font-bold text-slate-600">
              Email Mentor <span className="text-pink-600">*</span>
            </label>
            <input
              type="email"
              name="emailMentor"
              required
              value={formData.emailMentor}
              onChange={onInputChange}
              placeholder="cth. mentor.vicky@indosat.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <label className="text-[11px] font-bold text-slate-600">
            Tanggal Selesai Magang <span className="text-pink-600">*</span>
          </label>
          <input
            type="date"
            name="periodeMagangSelesai"
            required
            value={formData.periodeMagangSelesai}
            onChange={onInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#ED0278] focus:ring-2 focus:ring-pink-500/10 transition-all shadow-xs"
          />
        </div>
      </div>
    </>
  );
}
