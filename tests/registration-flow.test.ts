import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRegistrationForm,
  getFriendlyRegistrationError,
} from '../src/lib/registration-helpers.ts';
import type { InternRegistrationPayload } from '../src/types/index.ts';

describe('Intern Registration Client Validation & Error Parser', () => {
  const validPayload: InternRegistrationPayload = {
    namaLengkap: 'Dimas Wicaksono',
    email: 'dimas.wicaksono@ioh.co.id',
    password: 'SecurePassword2026!',
    pin: '654321',
    divisi: 'Cloud Infrastructure',
    namaMentor: 'Vicky Backend Lead',
    emailMentor: 'mentor.vicky@indosat.com',
    universitas: 'Institut Teknologi Bandung',
    jurusan: 'Teknik Komputer',
    periodeMagangSelesai: '2026-12-31',
    assignedLocationId: 'loc-kppti',
    facePhoto: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  };

  describe('validateRegistrationForm()', () => {
    test('should validate a complete and properly formatted payload', () => {
      const result = validateRegistrationForm(validPayload);
      assert.equal(result.isValid, true);
      assert.equal(result.error, null);
    });

    test('should reject missing full name', () => {
      const result = validateRegistrationForm({ ...validPayload, namaLengkap: '   ' });
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /nama lengkap/i);
    });

    test('should reject invalid email format', () => {
      const result = validateRegistrationForm({ ...validPayload, email: 'dimas-bukan-email' });
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /email.*tidak valid/i);
    });

    test('should reject short password (< 6 characters)', () => {
      const result = validateRegistrationForm({ ...validPayload, password: '123' });
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /password minimal 6/i);
    });

    test('should reject non-6-digit PIN', () => {
      const testCases = ['12345', '1234567', 'abcdef', '12345a', ''];
      for (const pin of testCases) {
        const result = validateRegistrationForm({ ...validPayload, pin });
        assert.equal(result.isValid, false, `Failed to reject pin: ${pin}`);
        assert.match(result.error || '', /6 digit angka/i);
      }
    });

    test('should reject missing mentor name or invalid mentor email', () => {
      const emptyMentor = validateRegistrationForm({ ...validPayload, namaMentor: '' });
      assert.equal(emptyMentor.isValid, false);
      assert.match(emptyMentor.error || '', /nama mentor/i);

      const invalidEmail = validateRegistrationForm({ ...validPayload, emailMentor: 'bukan-email' });
      assert.equal(invalidEmail.isValid, false);
      assert.match(invalidEmail.error || '', /email mentor.*tidak valid/i);
    });

    test('should reject missing academic info (universitas, jurusan, periodeMagangSelesai)', () => {
      const noUniv = validateRegistrationForm({ ...validPayload, universitas: '' });
      assert.equal(noUniv.isValid, false);

      const noMajor = validateRegistrationForm({ ...validPayload, jurusan: '' });
      assert.equal(noMajor.isValid, false);

      const noDate = validateRegistrationForm({ ...validPayload, periodeMagangSelesai: '' });
      assert.equal(noDate.isValid, false);
    });

    test('should reject missing or empty facePhoto', () => {
      const noPhoto = validateRegistrationForm({ ...validPayload, facePhoto: '' });
      assert.equal(noPhoto.isValid, false);
      assert.match(noPhoto.error || '', /foto wajah.*wajib/i);
    });
  });

  describe('getFriendlyRegistrationError()', () => {
    test('should provide detailed biometric guidance for HTTP 422 Unprocessable Entity', () => {
      const msg = getFriendlyRegistrationError(422, 'Tidak terdeteksi wajah manusia');
      assert.match(msg, /wajah biometrik gagal/i);
      assert.match(msg, /pencahayaan cukup/i);
    });

    test('should format duplicate email error for HTTP 409 Conflict', () => {
      const msg = getFriendlyRegistrationError(409, "Email 'dimas@ioh.co.id' sudah terdaftar");
      assert.match(msg, /sudah terdaftar/i);
    });

    test('should return server message for HTTP 400 Bad Request', () => {
      const msg = getFriendlyRegistrationError(400, 'PIN Presensi harus berupa 6 digit');
      assert.equal(msg, 'PIN Presensi harus berupa 6 digit');
    });

    test('should handle network or server failure gracefully', () => {
      const msg = getFriendlyRegistrationError(500, '');
      assert.match(msg, /terjadi kesalahan.*server/i);
    });
  });
});
