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
  pinHash?: string;
}

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT';

export type LeaveType = 'WFH' | 'SAKIT' | 'IZIN' | 'DISPENSASI' | 'OFF_SITE';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRequest {
  id: string;
  internId: string;
  date: string; // YYYY-MM-DD
  type: LeaveType;
  reason: string;
  attachmentPath?: string | null;
  status: RequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string; // ISO DateTime
}

export interface OfficeLocation {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  maxRadiusMeters: number;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  internId: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  checkInCoords?: Coordinates;
  checkOutCoords?: Coordinates;
  distanceInMeters?: number;
  locationId?: string;
  photoUrl?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MonthlyTimesheetSummary {
  internId: string;
  month: string; // YYYY-MM
  totalWorkDays: number;
  presentDays: number;
  onTimeDays: number;
  lateDays: number;
  earlyDepartureDays: number;
  wfhDays: number;
  sickDays: number;
  permitDays: number;
  absentDays: number;
  totalWorkHours: number;
  punctualityRate: number; // 0 - 100 percentage
  records: AttendanceRecord[];
  requests: AttendanceRequest[];
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
  status: AttendanceStatus | LeaveType;
  remarks?: string;
}

export interface DivisionBreakdown {
  division: string;
  totalInterns: number;
  present: number;
  absent: number;
  late: number;
  wfh?: number;
  sick?: number;
  permit?: number;
}

export interface DailyRecapSummary {
  date: string;
  totalActive: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  earlyDepartureCount: number;
  wfhCount?: number;
  sickCount?: number;
  permitCount?: number;
  absentCount: number;
  divisionBreakdowns: DivisionBreakdown[];
  items: RecapInternItem[];
}

