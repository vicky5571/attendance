'use client';

import React from 'react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'disconnected' | 'connecting' | 'open';
  qr: string | null;
  onConnect: () => void;
}

export function WhatsAppModal({ isOpen, onClose, status, qr, onConnect }: WhatsAppModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="w-12 h-12 rounded-2xl bg-[#ED0278]/10 text-[#ED0278] flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>

        <h3 className="text-base font-extrabold text-slate-900">WhatsApp Bot Integration</h3>
        <p className="text-xs text-slate-500 text-center mt-1 mb-4">
          Status: <strong className="text-[#ED0278] capitalize">{status}</strong>
        </p>

        {status === 'open' ? (
          <div className="p-5 rounded-2xl bg-emerald-50 text-center w-full border border-emerald-200">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-sm font-bold text-emerald-800 mt-2">WhatsApp Berhasil Terhubung!</div>
            <p className="text-xs text-emerald-600 mt-1">Notifikasi kehadiran aktif otomatis.</p>
          </div>
        ) : qr ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="p-3 bg-white rounded-2xl shadow-sm border-2 border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`}
                alt="WhatsApp QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            <p className="text-xs text-slate-500 text-center">
              Scan melalui WhatsApp di HP &rarr; <strong>Perangkat Tertaut</strong>.
            </p>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="w-full py-3.5 bg-[#ED0278] hover:bg-[#D0026B] text-white font-extrabold text-xs rounded-full transition shadow-md shadow-pink-500/20"
          >
            Hubungkan WhatsApp Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
