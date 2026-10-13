'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { InternProfile } from '@/types';

interface InternLoginFormProps {
  interns: InternProfile[];
  onSuccess?: () => void;
}

export function InternLoginForm({ interns, onSuccess }: InternLoginFormProps) {
  const router = useRouter();
  const { loginAsIntern } = useAuth();
  const [selectedId, setSelectedId] = useState(interns[0]?.id || 'intern-sarah');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount for laptop/PC users
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerSubmit = async (targetId: string, fullPin: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMsg('');
    const result = await loginAsIntern(targetId, fullPin);
    setLoading(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      window.location.href = '/';
    } else {
      setShake(true);
      setErrorMsg(result.error || 'PIN yang dimasukkan salah');
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
        triggerSubmit(selectedId, nextPin);
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

  // Keyboard shortcut listener for PC / Laptop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'SELECT') {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length === 6) {
          e.preventDefault();
          triggerSubmit(selectedId, pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedId, loading]);

  const selectedIntern = interns.find((i) => i.id === selectedId) || interns[0];

  return (
    <div className={`flex flex-col items-center w-full ${shake ? 'animate-bounce' : ''}`}>
      {/* Intern Selector Pill */}
      <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ED0278] to-[#FF4B98] flex items-center justify-center text-white font-extrabold text-base shadow-xs shrink-0">
            {selectedIntern?.namaLengkap?.charAt(0) || 'P'}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
              Pilih Identitas Magang
            </span>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPin('');
                setErrorMsg('');
                inputRef.current?.focus();
              }}
              className="text-xs font-extrabold text-slate-800 bg-transparent outline-none cursor-pointer w-full truncate"
            >
              {interns.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.namaLengkap} ({i.divisi})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PIN Prompt Header */}
      <p className="text-xs font-bold text-slate-700 text-center mb-0.5">
        Masukkan 6-Digit PIN Anda
      </p>
      <span className="text-[10px] text-slate-400 text-center mb-4">
        Default: <strong className="text-slate-700 font-mono">123456</strong>
      </span>

      {/* 6-Cell Interactive PIN Display with Hidden Keyboard Input */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="relative cursor-pointer flex flex-col items-center mb-4 group"
      >
        {/* Invisible Native Input (Captures Physical Keyboard & Mobile typing) */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPin(val);
            setErrorMsg('');
            if (val.length === 6) {
              triggerSubmit(selectedId, val);
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={loading}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
          autoComplete="off"
        />

        {/* 6 Modern PIN Cells */}
        <div className="flex items-center gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            const isCurrent = isFocused && idx === pin.length;

            return (
              <div
                key={idx}
                className={`w-10 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 ${
                  isFilled
                    ? 'bg-[#ED0278]/5 border-[#ED0278] shadow-sm shadow-pink-500/10'
                    : isCurrent
                    ? 'bg-white border-[#ED0278] ring-4 ring-[#ED0278]/15 scale-105'
                    : 'bg-slate-50 border-slate-200/90 group-hover:border-slate-300'
                }`}
              >
                {isFilled ? (
                  <span className="w-3 h-3 rounded-full bg-[#ED0278] transition-all scale-100" />
                ) : isCurrent ? (
                  <span className="w-1.5 h-3.5 bg-[#ED0278] rounded-full animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300/60" />
                )}
              </div>
            );
          })}
        </div>

        {/* Subtle Minimalist Helper */}
        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-400">
          <span>⌨️</span>
          <span>Ketik langsung via keyboard PC atau keypad di bawah</span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl mb-3.5 text-center w-full max-w-[260px]">
          {errorMsg}
        </div>
      )}

      {/* Numeric Keypad (for Mouse / Touch) */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            disabled={loading || pin.length >= 6}
            onClick={() => handleDigit(num)}
            className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-2xs border border-slate-100 active:scale-95"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleClear}
          className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-bold text-[11px] uppercase transition flex items-center justify-center cursor-pointer border border-slate-100 active:scale-95"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={loading || pin.length >= 6}
          onClick={() => handleDigit('0')}
          className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold text-lg transition flex items-center justify-center cursor-pointer shadow-2xs border border-slate-100 active:scale-95"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={handleDelete}
          className="h-11 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 font-extrabold text-sm transition flex items-center justify-center cursor-pointer border border-slate-100 active:scale-95"
        >
          ⌫
        </button>
      </div>

      {loading && (
        <div className="text-xs font-bold text-slate-500 flex items-center gap-2 py-2 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#ED0278] animate-ping" />
          Memvalidasi sesi...
        </div>
      )}
    </div>
  );
}
