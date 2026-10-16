import { getSupabaseAdmin } from '../supabase/admin.ts';
import type {
  OfficeConfig,
  InternProfile,
  AttendanceRecord,
  Coordinates,
  OfficeLocation,
  SessionRecord,
  AppUser,
  AttendanceRequest,
} from '../../types/index.ts';

// ==============================================================================
// Row Mappers (Postgres snake_case -> Application domain camelCase)
// ==============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOfficeConfigRow(row: any): OfficeConfig {
  return {
    targetLatitude: Number(row.target_latitude),
    targetLongitude: Number(row.target_longitude),
    maxRadiusMeters: Number(row.max_radius_meters),
    workStartTime: row.work_start_time,
    workEndTime: row.work_end_time,
    emailAtasan: row.email_atasan,
    waGroupInternsJid: row.wa_group_interns_jid || undefined,
    waGroupMentorsJid: row.wa_group_mentors_jid || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInternRow(row: any): InternProfile {
  return {
    id: row.id,
    namaLengkap: row.nama_lengkap,
    divisi: row.divisi,
    namaMentor: row.nama_mentor || 'Belum Ditugaskan',
    emailMentor: row.email_mentor || '',
    universitas: row.universitas,
    jurusan: row.jurusan,
    periodeMagangSelesai: row.periode_magang_selesai,
    status: row.status,
    pinHash: row.pin_hash || undefined,
    email: row.email || undefined,
    passwordHash: row.password_hash || undefined,
    assignedLocationId: row.assigned_location_id || undefined,
    photoUrl: row.photo_url || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAttendanceRow(row: any): AttendanceRecord {
  const record: AttendanceRecord = {
    id: row.id,
    internId: row.intern_id,
    date: typeof row.date === 'string' ? row.date.split('T')[0] : row.date,
    status: row.status,
    checkInTime: row.check_in_time || undefined,
    checkOutTime: row.check_out_time || undefined,
    distanceInMeters: row.distance_in_meters !== null ? Number(row.distance_in_meters) : undefined,
    remarks: row.remarks || undefined,
    locationId: row.location_id || undefined,
    photoUrl: row.photo_url || undefined,
    checkOutPhotoUrl: row.check_out_photo_url || undefined,
  };

  if (row.check_in_lat !== null && row.check_in_lng !== null) {
    record.checkInCoords = {
      latitude: Number(row.check_in_lat),
      longitude: Number(row.check_in_lng),
    };
  }

  if (row.check_out_lat !== null && row.check_out_lng !== null) {
    record.checkOutCoords = {
      latitude: Number(row.check_out_lat),
      longitude: Number(row.check_out_lng),
    };
  }

  return record;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLocationRow(row: any): OfficeLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    maxRadiusMeters: Number(row.max_radius_meters),
    isActive: Boolean(row.is_active),
  };
}

// ==============================================================================
// Supabase Data Operations
// ==============================================================================

export async function getOfficeConfigFromSupabase(): Promise<OfficeConfig | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.from('office_config').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return null;
  return mapOfficeConfigRow(data);
}

export async function upsertOfficeConfigToSupabase(config: OfficeConfig): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('office_config').upsert({
    id: 1,
    target_latitude: config.targetLatitude,
    target_longitude: config.targetLongitude,
    max_radius_meters: config.maxRadiusMeters,
    work_start_time: config.workStartTime,
    work_end_time: config.workEndTime,
    email_atasan: config.emailAtasan,
    wa_group_interns_jid: config.waGroupInternsJid || null,
    wa_group_mentors_jid: config.waGroupMentorsJid || null,
  });

  return !error;
}

export async function getInternFromSupabase(id: string): Promise<InternProfile | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.from('interns').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapInternRow(data);
}

export async function getInternByEmailFromSupabase(email: string): Promise<InternProfile | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('interns')
    .select('*')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error || !data) return null;
  return mapInternRow(data);
}

export async function createInternInSupabase(profile: InternProfile): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('interns').insert({
    id: profile.id,
    nama_lengkap: profile.namaLengkap,
    divisi: profile.divisi,
    nama_mentor: profile.namaMentor,
    email_mentor: profile.emailMentor,
    universitas: profile.universitas,
    jurusan: profile.jurusan,
    periode_magang_selesai: profile.periodeMagangSelesai,
    status: profile.status,
    pin_hash: profile.pinHash || null,
    email: profile.email ? profile.email.toLowerCase().trim() : null,
    password_hash: profile.passwordHash || null,
    assigned_location_id: profile.assignedLocationId || null,
    photo_url: profile.photoUrl || null,
  });

  if (error) {
    console.error('[Supabase] Failed to insert intern:', error);
    return false;
  }

  return true;
}

export async function updateInternPhotoInSupabase(internId: string, photoUrl: string): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('interns')
    .update({ photo_url: photoUrl })
    .eq('id', internId);

  return !error;
}

export async function updateInternMentorInSupabase(
  internId: string,
  namaMentor: string,
  emailMentor: string
): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('interns')
    .update({
      nama_mentor: namaMentor,
      email_mentor: emailMentor,
    })
    .eq('id', internId);

  return !error;
}

export async function listInternsFromSupabase(status?: 'ACTIVE' | 'COMPLETED'): Promise<InternProfile[]> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase.from('interns').select('*').order('nama_lengkap', { ascending: true });
  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapInternRow);
}

export async function getAttendanceRecordFromSupabase(
  internId: string,
  date: string
): Promise<AttendanceRecord | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('intern_id', internId)
    .eq('date', date)
    .maybeSingle();

  if (error || !data) return null;
  return mapAttendanceRow(data);
}

export async function recordCheckInInSupabase(record: AttendanceRecord): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('attendance_logs').upsert({
    id: record.id,
    intern_id: record.internId,
    date: record.date,
    check_in_time: record.checkInTime || null,
    check_in_lat: record.checkInCoords ? record.checkInCoords.latitude : null,
    check_in_lng: record.checkInCoords ? record.checkInCoords.longitude : null,
    distance_in_meters: record.distanceInMeters ?? null,
    status: record.status,
    remarks: record.remarks || null,
    location_id: record.locationId || null,
    photo_url: record.photoUrl || null,
  });

  return !error;
}

export async function recordCheckOutInSupabase(
  internId: string,
  date: string,
  checkOutTime: string,
  coords?: Coordinates,
  remarks?: string,
  photoUrl?: string
): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const payload: Record<string, unknown> = {
    check_out_time: checkOutTime,
  };

  if (coords) {
    payload.check_out_lat = coords.latitude;
    payload.check_out_lng = coords.longitude;
  }

  if (remarks !== undefined) payload.remarks = remarks;
  if (photoUrl) payload.check_out_photo_url = photoUrl;

  const { error } = await supabase
    .from('attendance_logs')
    .update(payload)
    .eq('intern_id', internId)
    .eq('date', date);

  if (error) {
    console.error('[Supabase] Failed to record check-out:', error);
    return false;
  }

  return true;
}

export async function deleteAttendanceRecordInSupabase(
  internId: string,
  date: string
): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('intern_id', internId)
    .eq('date', date);

  return !error;
}

export async function listOfficeLocationsFromSupabase(activeOnly = false): Promise<OfficeLocation[]> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase.from('office_locations').select('*').order('name', { ascending: true });
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapLocationRow);
}

export async function createOfficeLocationInSupabase(loc: OfficeLocation): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('office_locations').upsert({
    id: loc.id,
    name: loc.name,
    address: loc.address || null,
    latitude: loc.latitude,
    longitude: loc.longitude,
    max_radius_meters: loc.maxRadiusMeters,
    is_active: loc.isActive,
  });

  return !error;
}

export async function deleteOfficeLocationInSupabase(id: string): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('office_locations').delete().eq('id', id);
  return !error;
}

export async function findSessionByTokenInSupabase(token: string): Promise<SessionRecord | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.from('sessions').select('*').eq('token', token).maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    role: data.role,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

export async function createSessionInSupabase(session: SessionRecord): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('sessions').insert({
    id: session.id,
    user_id: session.userId,
    role: session.role,
    token: session.token,
    expires_at: session.expiresAt,
    created_at: session.createdAt,
  });

  return !error;
}

export async function deleteSessionFromSupabase(token: string): Promise<boolean> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('sessions').delete().eq('token', token);
  return !error;
}

export async function getUserByUsernameOrEmailFromSupabase(identifier: string): Promise<AppUser | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const clean = identifier.trim();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`email.ilike.${clean},username.ilike.${clean}`)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    username: data.username || undefined,
    email: data.email,
    passwordHash: data.password_hash,
    role: data.role,
    name: data.name,
    createdAt: data.created_at,
  };
}

export async function getInternByIdOrEmailFromSupabase(identifier: string): Promise<InternProfile | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  const clean = identifier.trim();
  const { data, error } = await supabase
    .from('interns')
    .select('*')
    .or(`id.eq.${clean},email.ilike.${clean}`)
    .maybeSingle();

  if (error || !data) return null;
  return mapInternRow(data);
}

export async function listAttendanceByDateFromSupabase(date: string): Promise<AttendanceRecord[]> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('date', date);

  if (error || !data) return [];
  return data.map(mapAttendanceRow);
}

export async function listApprovedRequestsByDateFromSupabase(date: string): Promise<AttendanceRequest[]> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('attendance_requests')
    .select('*')
    .eq('date', date)
    .eq('status', 'APPROVED');

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    internId: r.intern_id,
    date: typeof r.date === 'string' ? r.date.split('T')[0] : r.date,
    type: r.type,
    reason: r.reason,
    attachmentPath: r.attachment_path || undefined,
    status: r.status,
    reviewedBy: r.reviewed_by || undefined,
    reviewedAt: r.reviewed_at || undefined,
    createdAt: r.created_at,
  }));
}


