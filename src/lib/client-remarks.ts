/**
 * Dynamic Client Remarks Evaluator
 * Computes live punctuality and departure previews before submission.
 */

export interface DynamicRemarkPreview {
  type: 'CHECK_IN' | 'CHECK_OUT' | 'COMPLETED';
  isViolated: boolean;
  remarks: string;
  badgeColor: 'emerald' | 'amber' | 'slate';
}

/**
 * Parses time string (e.g. "08:30" or "08:30:00") into minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

/**
 * Computes live dynamic remark preview for upcoming attendance action.
 */
export function computeLiveRemarkPreview(
  currentTimeStr: string, // "HH:mm"
  isCheckedIn: boolean,
  isCompleted: boolean,
  workStartTime: string = '08:30',
  workEndTime: string = '17:30'
): DynamicRemarkPreview {
  if (isCompleted) {
    return {
      type: 'COMPLETED',
      isViolated: false,
      remarks: 'Presensi Hari Ini Selesai',
      badgeColor: 'emerald',
    };
  }

  const currentMinutes = timeStringToMinutes(currentTimeStr);

  if (!isCheckedIn) {
    const startMinutes = timeStringToMinutes(workStartTime);
    if (currentMinutes > startMinutes) {
      const diff = currentMinutes - startMinutes;
      return {
        type: 'CHECK_IN',
        isViolated: true,
        remarks: `Terlambat ${diff} menit`,
        badgeColor: 'amber',
      };
    }
    return {
      type: 'CHECK_IN',
      isViolated: false,
      remarks: 'Tepat Waktu',
      badgeColor: 'emerald',
    };
  }

  // Checked in, awaiting check-out
  const endMinutes = timeStringToMinutes(workEndTime);
  if (currentMinutes < endMinutes) {
    const diff = endMinutes - currentMinutes;
    return {
      type: 'CHECK_OUT',
      isViolated: true,
      remarks: `Pulang sebelum waktu kerja: lebih awal ${diff} menit`,
      badgeColor: 'amber',
    };
  }

  return {
    type: 'CHECK_OUT',
    isViolated: false,
    remarks: 'Tepat Waktu',
    badgeColor: 'emerald',
  };
}
