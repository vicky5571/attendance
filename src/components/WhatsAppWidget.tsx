'use client';

import React from 'react';

interface WhatsAppWidgetProps {
  status: 'disconnected' | 'connecting' | 'open';
  qr: string | null;
  onConnect: () => void;
}

export function WhatsAppWidget({ status, qr, onConnect }: WhatsAppWidgetProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">WhatsApp Bot Service</div>
            <div className="text-[11px] text-slate-400 capitalize">
              Status: <span className={status === 'open' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{status}</span>
            </div>
          </div>
        </div>
        {status === 'disconnected' && (
          <button
            onClick={onConnect}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-xl transition shadow"
          >
            Hubungkan WA
          </button>
        )}
      </div>

      {status === 'connecting' && qr && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 text-center flex flex-col items-center gap-3">
          <div className="text-xs font-semibold text-amber-300">Scan QR Code dengan WhatsApp Anda</div>
          <div className="p-3 bg-white rounded-2xl shadow-inner">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qr)}`}
              alt="WhatsApp QR Code"
              className="w-44 h-44 object-contain"
            />
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Buka WhatsApp di HP &rarr; Pengaturan &rarr; Perangkat Tertaut &rarr; Tautkan Perangkat.
          </p>
        </div>
      )}
    </div>
  );
}
