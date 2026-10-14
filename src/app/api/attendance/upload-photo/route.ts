import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getDatabase } from '../../../../lib/db/client.ts';
import { getIntern } from '../../../../lib/db/repo.ts';
import { enforceInternIdentity } from '../../../../lib/auth-guard.ts';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB limit
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.internId || !body.image) {
      return Response.json(
        { error: 'Field internId dan image wajib diisi' },
        { status: 400 }
      );
    }

    const { internId, image } = body;
    const db = getDatabase();

    // Zero-impersonation guard
    const identityCheck = enforceInternIdentity(req, db, internId);
    if (!identityCheck.allowed && identityCheck.errorResponse) {
      return identityCheck.errorResponse;
    }

    // Verify intern exists
    const intern = getIntern(db, internId);
    if (!intern) {
      return Response.json(
        { error: `Peserta magang dengan ID '${internId}' tidak ditemukan` },
        { status: 404 }
      );
    }

    // Parse Data URI or raw base64
    let mimeType = 'image/jpeg';
    let base64Data = image;

    const dataUriMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      mimeType = dataUriMatch[1].toLowerCase();
      base64Data = dataUriMatch[2];
    }

    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) {
      return Response.json(
        {
          error: `Format gambar tidak didukung (${mimeType}). Format yang didukung: JPEG, PNG, WEBP`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      return Response.json({ error: 'Data gambar kosong atau tidak valid' }, { status: 400 });
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      return Response.json(
        {
          error: `Ukuran foto melebihi batas maksimal 3MB (ukuran saat ini: ${(
            buffer.length /
            (1024 * 1024)
          ).toFixed(2)}MB)`,
        },
        { status: 400 }
      );
    }

    // Prepare upload directory: public/uploads/selfies
    const targetDir = join(process.cwd(), 'public', 'uploads', 'selfies');
    await mkdir(targetDir, { recursive: true });

    // Generate collision-resistant filename
    const sanitizedId = internId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${sanitizedId}-${Date.now()}-${randomBytes(4).toString('hex')}${extension}`;
    const filePath = join(targetDir, filename);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/selfies/${filename}`;

    return Response.json(
      {
        message: 'Foto selfie berhasil diunggah',
        photoUrl: publicUrl,
        size: buffer.length,
        mimeType,
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

