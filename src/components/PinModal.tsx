'use client';

import React, { useState, useEffect } from 'react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<boolean>;
  actionType: 'check-in' | 'check-out';
  internName: string;
}

export function PinModal({
  isOpen,
  onClose,
  onSubmit,
  actionType,
  internName,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 6) {
        triggerSubmit(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const triggerSubmit = async (fullPin: string) => {
    setLoading(true);
    setErrorMsg('');
    const success = await onSubmit(fullPin);
    setLoading(false);
    if (!success) {
      setShake(true);
      setErrorMsg('PIN salah. Silakan coba lagi (Default: 123456)');
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#ED0278]/10 text-[#ED0278] flex items-center justify-center mb-3">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 text-center tracking-tight">
          Verifikasi PIN Presensi
        </h3>
        <p className="text-xs text-slate-500 text-center mt-1 px-4">
          Masukkan 6-digit PIN untuk konfirmasi{' '}
          <span className="font-bold text-slate-800">
            {actionType === 'check-in' ? 'Check-In' : 'Check-Out'}
          </span>{' '}
          peserta <span className="font-semibold text-[#ED0278]">{internName}</span>
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center gap-3 my-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  isFilled
                    ? 'bg-[#ED0278] border-[#ED0278] scale-110 shadow-sm shadow-pink-500/30'
                    : 'bg-slate-100 border-slate-200'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading || pin.length >= 6}
              onClick={() => handleDigit(num)}
              className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-xs border border-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-bold text-xs uppercase transition flex items-center justify-center cursor-pointer border border-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={loading || pin.length >= 6}
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-xs border border-slate-100"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-extrabold text-sm transition flex items-center justify-center cursor-pointer border border-slate-100"
          >
            ⌫
          </button>
        </div>

        {/* Loading Indicator or Cancel */}
        {loading ? (
          <div className="text-xs font-bold text-slate-500 flex items-center gap-2 py-2">
            <span className="w-2 h-2 rounded-full bg-[#ED0278] animate-ping" />
            Memverifikasi ke server...
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-extrabold text-slate-500 hover:text-slate-800 py-2 cursor-pointer transition"
          >
            Batalkan Presensi
          </button>
        )}
      </div>
    </div>
  );
}
