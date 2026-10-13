'use client';

import React from 'react';
import { AttendanceHistoryView } from '@/components/AttendanceHistoryView';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  internId: string;
  internName: string;
}

export function HistoryModal({
  isOpen,
  onClose,
  internId,
  internName,
}: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        <AttendanceHistoryView
          internId={internId}
          internName={internName}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
}