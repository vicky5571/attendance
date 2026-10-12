'use client';

import React from 'react';
import type { OfficeLocation } from '@/types';

interface ChangeOfficeModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: OfficeLocation[];
  selectedLocationId: string;
  onSelectLocation: (locationId: string) => void;
}

export function ChangeOfficeModal({
  isOpen,
  onClose,
  locations,
  selectedLocationId,
  onSelectLocation,
}: ChangeOfficeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl flex flex-col border border-slate-100 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#ED0278] flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Pilih Kantor / Lokasi Kerja
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                Pilih regional hub tempat Anda melaksanakan presensi hari ini
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

        {/* Office Locations List */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5 my-1">
          {locations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Belum ada lokasi kantor terdaftar.
            </div>
          ) : (
            locations.map((loc) => {
              const isSelected = loc.id === selectedLocationId;
              return (
                <div
                  key={loc.id}
                  onClick={() => {
                    onSelectLocation(loc.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isSelected
                      ? 'border-[#ED0278] bg-pink-50/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900">
                        {loc.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ED0278] text-white">
                          Sedang Aktif
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      Radius: {loc.maxRadiusMeters}m
                    </span>
                  </div>

                  {loc.address && (
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                      {loc.address}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
                    <span>
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </span>
                    <span
                      className={`font-sans font-extrabold ${
                        isSelected ? 'text-[#ED0278]' : 'text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Terpilih' : 'Pilih Kantor Ini'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
