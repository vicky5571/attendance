'use client';

import React, { useState } from 'react';
import { SelfieModal } from '@/components/SelfieModal';

export interface BiometricCameraCaptureProps {
  facePhoto: string | null;
  onPhotoCaptured: (base64Photo: string) => void;
  onPhotoReset: () => void;
  onError?: (errorMessage: string) => void;
}

export function BiometricCameraCapture({
  facePhoto,
  onPhotoCaptured,
  onPhotoReset,
}: BiometricCameraCaptureProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center w-full">
      {facePhoto ? (
        /* Captured Photo Card (Matching Indosat styling) */
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-950 flex items-center justify-center group">
            <img
              src={facePhoto}
              alt="Pratinjau Biometrik Wajah"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-white rounded-full p-1.5 shadow-md">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="absolute bottom-2.5 inset-x-2.5 bg-slate-950/70 backdrop-blur-xs text-white text-[10px] font-bold py-1.5 px-2 rounded-xl text-center">
              ✓ Foto Wajah Siap Diverifikasi
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Foto Ulang</span>
            </button>
            <button
              type="button"
              onClick={onPhotoReset}
              className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Live Camera Trigger State (No Gallery Upload) */
        <div className="w-full max-w-[280px] rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-6 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ED0278]/10 to-[#FF4B98]/20 text-[#ED0278] flex items-center justify-center mb-3 shadow-2xs">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h3 className="text-xs font-black text-slate-800">Biometrik Wajah Belum Ada</h3>
          <p className="text-[11px] text-slate-400 mt-1 mb-4 leading-relaxed">
            Wajib mengambil foto langsung menggunakan kamera. Unggah dari galeri atau berkas tidak diizinkan.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ED0278] via-[#FF2686] to-[#FF4B98] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-pink-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>Buka Kamera Selfie</span>
          </button>
        </div>
      )}

      {/* Reusable SelfieModal matching check-in/check-out strictly via live camera */}
      <SelfieModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCapture={(base64) => {
          onPhotoCaptured(base64);
          setIsModalOpen(false);
        }}
        actionType="register"
        title="Verifikasi Biometrik Wajah"
      />
    </div>
  );
}
