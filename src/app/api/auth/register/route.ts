import { randomBytes } from 'node:crypto';
import { uploadImageFile } from '../../../../lib/storage/service.ts';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getInternByEmail, createIntern } from '../../../../lib/db/repo.ts';
import { hashPassword } from '../../../../lib/auth.ts';
import { detectFace } from '../../../../lib/services/face-detection.ts';
import { isSupabaseConfigured } from '../../../../lib/supabase/admin.ts';
import {
  getInternByEmailFromSupabase,
  createInternInSupabase,
} from '../../../../lib/db/supabase-repo.ts';
import type { InternProfile, InternRegistrationPayload } from '../../../../types/index.ts';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB limit
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as InternRegistrationPayload | null;
    if (!body) {
      return Response.json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    const {
      namaLengkap,
      email,
      password,
      pin,
      divisi,
      namaMentor,
      emailMentor,
      universitas,
      jurusan,
      periodeMagangSelesai,
      assignedLocationId,
      facePhoto,
    } = body;

    // 1. Mandatory Fields Validation
    if (
      !namaLengkap?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !divisi?.trim() ||
      !universitas?.trim() ||
      !jurusan?.trim() ||
      !periodeMagangSelesai?.trim() ||
      !facePhoto?.trim()
    ) {
      return Response.json(
        { error: 'Seluruh field wajib diisi lengkap termasuk foto wajah' },
        { status: 400 }
      );
    }

    // 2. Format Validations
    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return Response.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password minimal terdiri dari 6 karakter' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 3. Email Uniqueness Check
    if (isSupabaseConfigured()) {
      const existingInSupabase = await getInternByEmailFromSupabase(cleanEmail);
      if (existingInSupabase) {
        return Response.json(
          { error: `Email '${cleanEmail}' sudah terdaftar dalam sistem` },
          { status: 409 }
        );
      }
    }

    const existingIntern = getInternByEmail(db, cleanEmail);
    if (existingIntern) {
      return Response.json(
        { error: `Email '${cleanEmail}' sudah terdaftar dalam sistem` },
        { status: 409 }
      );
    }

    // 4. Face Photo Parsing & Decoding
    let mimeType = 'image/jpeg';
    let base64Data = facePhoto;

    const dataUriMatch = facePhoto.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1].toLowerCase();
      base64Data = dataUriMatch[2];
    }

    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return Response.json(
        { error: `Format foto tidak didukung (${mimeType}). Format yang didukung: JPEG, PNG, WEBP` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return Response.json({ error: 'Data foto wajah kosong atau tidak valid' }, { status: 400 });
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      return Response.json(
        {
          error: `Ukuran foto melebihi batas maksimal 3MB (${(buffer.length / (1024 * 1024)).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    // 5. Biometric Human Face Detection Check
    const faceDetection = await detectFace(buffer);
    if (!faceDetection.detected) {
      return Response.json(
        {
          error: 'Tidak terdeteksi wajah manusia pada foto yang diunggah. Pastikan wajah terlihat jelas dan menghadap kamera.',
          details: faceDetection.reason,
        },
        { status: 422 }
      );
    }

    // 6. Save Face Photo via Unified Storage Service (Supabase Storage or local fallback)
    const internId = `intern-${randomBytes(4).toString('hex')}`;
    const uploadResult = await uploadImageFile('faces', internId, buffer, extension, mimeType);
    const photoUrl = uploadResult.url;

    // 7. Persist Intern Record with Hashed Password & PIN
    const passwordHash = hashPassword(password);

    const newIntern: InternProfile = {
      id: internId,
      namaLengkap: namaLengkap.trim(),
      divisi: divisi.trim(),
      namaMentor: namaMentor?.trim() || 'Belum Ditugaskan',
      emailMentor: emailMentor?.trim() || '',
      universitas: universitas.trim(),
      jurusan: jurusan.trim(),
      periodeMagangSelesai: periodeMagangSelesai.trim(),
      status: 'ACTIVE',
      pinHash: pin?.trim() || undefined,
      email: cleanEmail,
      passwordHash,
      assignedLocationId: assignedLocationId || 'loc-kppti',
      photoUrl,
    };

    if (isSupabaseConfigured()) {
      const savedToSupabase = await createInternInSupabase(newIntern);
      if (!savedToSupabase) {
        console.error('[Register API] Failed to save intern profile to Supabase');
      }
    }

    try {
      createIntern(db, newIntern);
    } catch {
      // Local SQLite fallback in case of read-only FS or memory mode
    }

    return Response.json(
      {
        message: 'Registrasi berhasil',
        intern: {
          id: newIntern.id,
          namaLengkap: newIntern.namaLengkap,
          email: newIntern.email,
          divisi: newIntern.divisi,
          namaMentor: newIntern.namaMentor,
          emailMentor: newIntern.emailMentor,
          universitas: newIntern.universitas,
          jurusan: newIntern.jurusan,
          periodeMagangSelesai: newIntern.periodeMagangSelesai,
          status: newIntern.status,
          assignedLocationId: newIntern.assignedLocationId,
          photoUrl: newIntern.photoUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

