'use client';

import React, { useState, useEffect } from 'react';

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // If running outside browser, exit
    if (typeof window === 'undefined') return;

    // Check if splash screen has already been shown in this browser session
    try {
      if (sessionStorage.getItem('ioh_splash_shown')) {
        setIsDismissed(true);
        return;
      }
    } catch {
      // In case sessionStorage is blocked
      setIsDismissed(true);
      return;
    }

    setMounted(true);

    // Fade out after 1000ms
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1000);

    // Fully dismiss and mark shown at 1400ms
    const hideTimer = setTimeout(() => {
      setIsDismissed(true);
      try {
        sessionStorage.setItem('ioh_splash_shown', 'true');
      } catch {}
    }, 1400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleManualDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('ioh_splash_shown', 'true');
    } catch {}
  };

  if (isDismissed || !mounted) return null;

  return (
    <div
      onClick={handleManualDismiss}
      aria-hidden={isFadingOut}
      className={`fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-8 transition-opacity duration-500 ease-out select-none cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Spacer */}
      <div className="w-full h-8" />

      {/* Main Center Content */}
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Indosat Ooredoo Hutchison Official Logo */}
        <div className="transform transition-transform duration-700 ease-out scale-100 animate-pulse">
          <img
            src="/icons/logo.png"
            alt="Indosat Ooredoo Hutchison"
            className="h-14 sm:h-16 w-auto object-contain"
          />
        </div>

        {/* System Title */}
        <h1 className="text-lg font-black text-slate-900 tracking-tight mt-6">
          Sistem Presensi Magang
        </h1>
        <p className="text-xs font-semibold text-slate-400 mt-1">
          Indosat Ooredoo Hutchison &bull; IAC Program
        </p>

        {/* Indosat Signature Magenta-Red Progress Line */}
        <div className="w-40 h-1 bg-slate-100 rounded-full mt-6 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-[#ED0278] via-[#FF2686] to-[#ED1C24] rounded-full w-full animate-pulse" />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center">
        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Empowering Indonesia&apos;s Digital Talent
        </p>
      </div>
    </div>
  );
}
