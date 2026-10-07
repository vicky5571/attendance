/**
 * Single Source of Truth (SSOT) Domain Types
 * Attendance PWA System
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface InternProfile {
  id: string;
  namaLengkap: string;
  divisi: string;
  namaMentor: string;
  emailMentor: string;
  universitas: string;
  jurusan: string;
  periodeMagangSelesai: string; // ISO Date YYYY-MM-DD
  status: 'ACTIVE' | 'COMPLETED';
}

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT';

export interface AttendanceRecord {
  id: string;
  internId: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  checkInCoords?: Coordinates;
  checkOutCoords?: Coordinates;
  distanceInMeters?: number;
  status: AttendanceStatus;
  remarks?: string;
}

export interface OfficeConfig {
  targetLatitude: number;
  targetLongitude: number;
  maxRadiusMeters: number;
  workStartTime: string; // e.g. "08:30"
  workEndTime: string;   // e.g. "17:30"
  emailAtasan: string;
  waGroupInternsJid?: string;
  waGroupMentorsJid?: string;
}

export interface RecapInternItem {
  internId: string;
  namaLengkap: string;
  divisi: string;
  namaMentor: string;
  emailMentor: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface DivisionBreakdown {
  division: string;
  totalInterns: number;
  present: number;
  absent: number;
  late: number;
}

export interface DailyRecapSummary {
  date: string;
  totalActive: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  earlyDepartureCount: number;
  absentCount: number;
  divisionBreakdowns: DivisionBreakdown[];
  items: RecapInternItem[];
}

