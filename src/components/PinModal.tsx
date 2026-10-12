'use client';

import React, { useState, useEffect, useRef } from 'react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const triggerSubmit = async (fullPin: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    const success = await onSubmit(fullPin);
    setLoading(false);
    if (!success) {
      setShake(true);
      setErrorMsg('PIN salah. Silakan coba lagi (Default: 123456)');
      setTimeout(() => setShake(false), 500);
      setPin('');
      inputRef.current?.focus();
    }
  };

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
    inputRef.current?.focus();
  };

  // Keyboard shortcut listener when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        if (pin.length === 6) {
          e.preventDefault();
          triggerSubmit(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin, loading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col items-center ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#ED0278]/10 text-[#ED0278] flex items-center justify-center text-2xl font-black mb-3">
          🔒
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

        {/* Keyboard Direct Input Box */}
        <div className="w-full max-w-[240px] my-4">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            placeholder="Ketik PIN..."
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(val);
              setErrorMsg('');
              if (val.length === 6) {
                triggerSubmit(val);
              }
            }}
            disabled={loading}
            className="w-full text-center tracking-[0.4em] font-mono text-base font-black py-2 px-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-[#ED0278] transition shadow-2xs text-slate-800"
          />
          <div className="text-[10px] text-slate-400 text-center mt-1">
            ⌨️ Ketik via keyboard PC atau klik tombol
          </div>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center gap-3 mb-4">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border-2 ${
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
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading || pin.length >= 6}
              onClick={() => handleDigit(num)}
              className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-xs border border-slate-100"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleClear}
            className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-bold text-xs uppercase transition flex items-center justify-center cursor-pointer border border-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={loading || pin.length >= 6}
            onClick={() => handleDigit('0')}
            className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-xs border border-slate-100"
          >
            0
          </button>
          <button
            type="button"
            disabled={loading || pin.length === 0}
            onClick={handleDelete}
            className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-extrabold text-sm transition flex items-center justify-center cursor-pointer border border-slate-100"
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
