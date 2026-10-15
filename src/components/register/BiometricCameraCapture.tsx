'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  onError,
}: BiometricCameraCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Akses kamera tidak didukung pada peramban web ini');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraLoading(false);
        };
      }
      setCameraActive(true);
    } catch (err) {
      setCameraLoading(false);
      setCameraActive(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'Izin akses kamera ditolak. Silakan gunakan opsi unggah foto manual.';
      setCameraError(msg);
      if (onError) onError(msg);
    }
  }, [stopCamera, onError]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    const targetDim = 640;
    canvas.width = targetDim;
    canvas.height = targetDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Mirror horizontally for natural selfie view
    ctx.translate(targetDim, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onPhotoCaptured(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const err = 'Berkas yang dipilih harus berupa file gambar (JPG, PNG, atau WEBP).';
      setCameraError(err);
      if (onError) onError(err);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const err = 'Ukuran file foto maksimal adalah 5MB.';
      setCameraError(err);
      if (onError) onError(err);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetDim = 640;
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onPhotoCaptured(dataUrl);
        stopCamera();
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Viewfinder / Preview Frame */}
      {facePhoto ? (
        /* Captured Photo Preview */
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md flex items-center justify-center bg-black">
          <img
            src={facePhoto}
            alt="Pratinjau Biometrik Wajah"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="absolute bottom-2 inset-x-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold py-1 px-2 rounded-lg text-center">
            ✓ Foto Wajah Siap Diverifikasi
          </div>
        </div>
      ) : cameraActive ? (
        /* Live Camera Viewfinder with Oval Guide */
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-[#ED0278] shadow-md bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {/* Face Guide Oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-40 border-2 border-dashed border-pink-400/80 rounded-[50%] animate-pulse" />
          </div>
          <div className="absolute bottom-2 inset-x-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold py-1 px-2 rounded-lg text-center pointer-events-none">
            Posisikan wajah di dalam garis
          </div>
        </div>
      ) : (
        /* Idle Placeholder */
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-pink-50 text-[#ED0278] flex items-center justify-center mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-slate-700">Kamera Belum Aktif</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Ambil foto selfie langsung dengan kamera perangkat Anda
          </p>
        </div>
      )}

      {/* Inline Camera Error */}
      {cameraError && (
        <p className="text-[11px] font-semibold text-rose-600 mt-2 text-center max-w-xs">
          {cameraError}
        </p>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 w-full">
        {facePhoto ? (
          <button
            type="button"
            onClick={() => {
              onPhotoReset();
              startCamera();
            }}
            className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Ambil Foto Ulang</span>
          </button>
        ) : cameraActive ? (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#ED0278] to-[#FF4500] hover:from-[#c40062] hover:to-[#e03d00] text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Jepret Foto Sekarang</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              Batal
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraLoading}
              className="py-2 px-4 rounded-xl bg-[#ED0278] hover:bg-[#c40062] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{cameraLoading ? 'Menghubungkan...' : 'Buka Kamera Langsung'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Unggah File Foto</span>
            </button>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
