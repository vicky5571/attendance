'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SelfieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  actionType?: 'check-in' | 'check-out';
  internName?: string;
  isUploading?: boolean;
}

export function SelfieModal({
  isOpen,
  onClose,
  onCapture,
  actionType = 'check-in',
  internName,
  isUploading = false,
}: SelfieModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung pada browser ini');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraLoading(false);
        };
      } else {
        setCameraLoading(false);
      }
    } catch (err) {
      setCameraLoading(false);
      const msg = err instanceof Error ? err.message : 'Izin akses kamera ditolak';
      setCameraError(msg);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && !previewImage) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      setPreviewImage(null);
      setCameraError(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, previewImage, startCamera, stopCamera]);

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    const targetDim = 640;
    canvas.width = targetDim;
    canvas.height = targetDim;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop square from video center
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Mirror horizontally to match selfie view
    ctx.translate(targetDim, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);

    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewImage(base64);
    stopCamera();
  };

  const handleRetake = () => {
    setPreviewImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (previewImage) {
      onCapture(previewImage);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewImage(base64);
        stopCamera();
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const isCheckIn = actionType === 'check-in';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col items-center relative overflow-hidden my-auto max-h-[92dvh]">
        {/* Header Ribbon */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ED0278] animate-pulse" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              Verifikasi Selfie {isCheckIn ? 'Check-In' : 'Check-Out'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition cursor-pointer disabled:opacity-50"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {internName && (
          <p className="text-[11px] font-semibold text-slate-500 mb-3 text-center">
            Peserta: <strong className="text-slate-800">{internName}</strong>
          </p>
        )}

        {/* Viewfinder / Camera Screen */}
        <div className="w-full relative aspect-square max-w-[280px] bg-slate-950 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-200/80 flex items-center justify-center group">
          {previewImage ? (
            /* Preview Captured Photo */
            <img
              src={previewImage}
              alt="Preview Selfie"
              className="w-full h-full object-cover rounded-3xl"
            />
          ) : (
            /* Live WebRTC Camera Stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Viewfinder Face Positioning Oval Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                <svg
                  className="w-48 h-56 text-white/90 drop-shadow-[0_0_12px_rgba(237,2,120,0.6)]"
                  viewBox="0 0 160 200"
                  fill="none"
                >
                  {/* Face Oval */}
                  <ellipse
                    cx="80"
                    cy="100"
                    rx="62"
                    ry="84"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                  />
                  {/* Focus Center Target */}
                  <circle cx="80" cy="100" r="3.5" fill="#ED0278" />
                  {/* Corner Accent Brackets */}
                  <path d="M 22 36 L 22 22 L 36 22" stroke="#ED0278" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 138 36 L 138 22 L 124 22" stroke="#ED0278" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 22 164 L 22 178 L 36 178" stroke="#ED0278" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 138 164 L 138 178 L 124 178" stroke="#ED0278" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              {/* Camera Loading Spinner */}
              {cameraLoading && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 text-white text-xs font-semibold">
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengaktifkan kamera...</span>
                </div>
              )}

              {/* Camera Error / Permission Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 p-4 flex flex-col items-center justify-center gap-3 text-center text-white">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-lg">
                    📷
                  </div>
                  <div className="text-xs font-bold text-rose-300">Akses Kamera Diperlukan</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Presensi wajib selfie langsung. Izinkan akses kamera browser atau buka kamera perangkat langsung:
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-full bg-[#ED0278] text-white font-extrabold text-xs shadow-md shadow-pink-500/20 hover:bg-[#d6026c] transition cursor-pointer"
                  >
                    Buka Kamera HP Langsung
                  </button>
                </div>
              )}
            </>
          )}

          {/* Hidden Direct Camera Fallback (capture="user" strictly triggers device front camera) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Caption Guide */}
        <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
          {previewImage
            ? 'Pastikan wajah terlihat jelas tanpa masker atau penutup wajah.'
            : 'Posisikan wajah Anda tepat di dalam area lingkaran panduan.'}
        </p>

        {/* Action Buttons */}
        <div className="w-full mt-4 flex items-center justify-center">
          {previewImage ? (
            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                disabled={isUploading}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer disabled:opacity-50 text-center"
              >
                Foto Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isUploading}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#ED0278] to-[#FF4B98] hover:from-[#d6026c] hover:to-[#e63e87] text-white font-extrabold text-xs transition shadow-lg shadow-pink-500/20 cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <span>Gunakan Foto</span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={handleCaptureFrame}
                disabled={Boolean(cameraError) || cameraLoading}
                className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] shadow-lg shadow-pink-500/25 active:scale-95 transition cursor-pointer disabled:opacity-40 flex items-center justify-center"
                aria-label="Ambil Foto"
              >
                <div className="w-full h-full rounded-full border-2 border-white flex items-center justify-center bg-white/10">
                  <div className="w-11 h-11 rounded-full bg-white active:scale-90 transition shadow-xs" />
                </div>
              </button>
              <span className="text-[10px] font-bold text-slate-400">
                Tekan tombol untuk ambil foto selfie
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
