import type { InternRegistrationPayload } from '../types/index.ts';

export interface RegistrationValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates intern registration form fields on the client before network dispatch.
 */
export function validateRegistrationForm(
  data: Partial<InternRegistrationPayload>
): RegistrationValidationResult {
  if (!data.namaLengkap || !data.namaLengkap.trim()) {
    return { isValid: false, error: 'Nama lengkap wajib diisi.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    return { isValid: false, error: 'Format alamat email tidak valid.' };
  }

  if (!data.password || data.password.length < 6) {
    return { isValid: false, error: 'Password minimal 6 karakter.' };
  }

  if (!data.pin || !/^\d{6}$/.test(data.pin)) {
    return { isValid: false, error: 'PIN Presensi harus berupa 6 digit angka.' };
  }

  if (!data.divisi || !data.divisi.trim()) {
    return { isValid: false, error: 'Divisi magang wajib diisi.' };
  }

  if (!data.namaMentor || !data.namaMentor.trim()) {
    return { isValid: false, error: 'Nama mentor pembimbing wajib diisi.' };
  }

  if (!data.emailMentor || !emailRegex.test(data.emailMentor.trim())) {
    return { isValid: false, error: 'Format alamat email mentor tidak valid.' };
  }

  if (!data.universitas || !data.universitas.trim()) {
    return { isValid: false, error: 'Asal universitas / kampus wajib diisi.' };
  }

  if (!data.jurusan || !data.jurusan.trim()) {
    return { isValid: false, error: 'Program studi / jurusan wajib diisi.' };
  }

  if (!data.periodeMagangSelesai || !data.periodeMagangSelesai.trim()) {
    return { isValid: false, error: 'Periode selesai magang wajib diisi.' };
  }

  if (!data.facePhoto || !data.facePhoto.trim()) {
    return { isValid: false, error: 'Foto wajah referensi biometrik wajib diisi.' };
  }

  return { isValid: true, error: null };
}

/**
 * Translates server HTTP status codes into helpful, friendly Indonesian messages.
 */
export function getFriendlyRegistrationError(
  status: number,
  serverMessage?: string
): string {
  if (status === 422) {
    return '⚠️ Verifikasi Wajah Biometrik Gagal: Sistem AI tidak mendeteksi wajah manusia pada foto. Pastikan pencahayaan cukup, wajah menghadap lurus ke kamera tanpa masker atau kacamata gelap.';
  }

  if (status === 409) {
    return serverMessage || 'Alamat email sudah terdaftar dalam sistem. Silakan gunakan email lain atau masuk ke akun Anda.';
  }

  if (status === 400) {
    return serverMessage || 'Data pendaftaran tidak lengkap atau format tidak sesuai.';
  }

  if (serverMessage && serverMessage.trim()) {
    return serverMessage;
  }

  return 'Terjadi kesalahan pada server saat pendaftaran. Silakan periksa koneksi dan coba beberapa saat lagi.';
}
