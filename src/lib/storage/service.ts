import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getSupabaseAdmin, isSupabaseConfigured } from '../supabase/admin.ts';

export interface UploadResult {
  url: string;
  filename: string;
  storageProvider: 'supabase' | 'local';
}

/**
 * Uploads an image buffer either to Supabase Storage (if configured)
 * or to local filesystem (public/uploads/) as a fallback for offline development/tests.
 * 
 * @param folder Bucket or folder name: 'selfies' or 'faces'
 * @param internId Intern ID for collision-resistant prefixing
 * @param buffer Raw binary image buffer
 * @param extension File extension including dot (e.g. '.jpg', '.png')
 * @param mimeType Image MIME type (e.g. 'image/jpeg')
 */
export async function uploadImageFile(
  folder: 'selfies' | 'faces',
  internId: string,
  buffer: Buffer,
  extension: string,
  mimeType: string
): Promise<UploadResult> {
  const sanitizedId = internId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${sanitizedId}-${Date.now()}-${randomBytes(4).toString('hex')}${extension}`;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseAdmin();
      if (supabase) {
        let { data, error } = await supabase.storage
          .from(folder)
          .upload(filename, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        // If bucket does not exist, attempt to auto-create public bucket and retry upload
        if (error && (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('bucket'))) {
          try {
            const { error: createError } = await supabase.storage.createBucket(folder, {
              public: true,
              fileSizeLimit: 5 * 1024 * 1024,
            });

            if (!createError) {
              const retry = await supabase.storage
                .from(folder)
                .upload(filename, buffer, {
                  contentType: mimeType,
                  upsert: true,
                });
              data = retry.data;
              error = retry.error;
            }
          } catch (createErr) {
            console.warn(`[Supabase Storage] Auto-create bucket '${folder}' failed:`, createErr);
          }
        }

        if (!error && data) {
          const { data: publicData } = supabase.storage.from(folder).getPublicUrl(filename);
          return {
            url: publicData.publicUrl,
            filename,
            storageProvider: 'supabase',
          };
        } else if (error) {
          console.warn(`[Supabase Storage] Upload to '${folder}' failed, falling back:`, error.message);
        }
      }
    } catch (err) {
      console.warn(`[Supabase Storage] Exception during upload, falling back:`, err);
    }
  }

  // Local filesystem fallback (only when NOT running in Vercel/serverless read-only container)
  if (!process.env.VERCEL) {
    try {
      const targetDir = join(process.cwd(), 'public', 'uploads', folder);
      await mkdir(targetDir, { recursive: true });
      const filePath = join(targetDir, filename);

      await writeFile(filePath, buffer);

      return {
        url: `/uploads/${folder}/${filename}`,
        filename,
        storageProvider: 'local',
      };
    } catch (fsErr) {
      console.warn(`[Storage Service] Local disk write failed:`, fsErr);
    }
  }

  // Resilient Data URI fallback for Vercel / Serverless read-only environments
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return {
    url: dataUri,
    filename,
    storageProvider: 'local',
  };
}

