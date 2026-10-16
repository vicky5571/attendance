import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { uploadImageFile } from '../src/lib/storage/service.ts';

describe('Unified Storage Service (Supabase & Local Fallback)', () => {
  const createdFiles: string[] = [];

  after(async () => {
    for (const file of createdFiles) {
      try {
        await unlink(file);
      } catch {
        // ignore cleanup error
      }
    }
  });

  test('should fallback to local storage when Supabase is not configured (selfies)', async () => {
    const fakeBuffer = Buffer.from('fake-selfie-image-data-12345');
    const internId = 'test-intern-01';

    const result = await uploadImageFile('selfies', internId, fakeBuffer, '.jpg', 'image/jpeg');

    assert.strictEqual(result.storageProvider, 'local');
    assert.match(result.url, /^\/uploads\/selfies\/test-intern-01-\d+-[a-f0-9]+\.jpg$/);
    assert.ok(result.filename.startsWith('test-intern-01-'));

    // Verify file actually exists on local filesystem
    const localPath = join(process.cwd(), 'public', 'uploads', 'selfies', result.filename);
    createdFiles.push(localPath);

    const fileContent = await readFile(localPath);
    assert.deepStrictEqual(fileContent, fakeBuffer);
  });

  test('should fallback to local storage when Supabase is not configured (faces)', async () => {
    const fakeBuffer = Buffer.from('fake-registration-face-data-67890');
    const internId = 'test-intern-02';

    const result = await uploadImageFile('faces', internId, fakeBuffer, '.png', 'image/png');

    assert.strictEqual(result.storageProvider, 'local');
    assert.match(result.url, /^\/uploads\/faces\/test-intern-02-\d+-[a-f0-9]+\.png$/);
    assert.ok(result.filename.startsWith('test-intern-02-'));

    // Verify file actually exists on local filesystem
    const localPath = join(process.cwd(), 'public', 'uploads', 'faces', result.filename);
    createdFiles.push(localPath);

    const fileContent = await readFile(localPath);
    assert.deepStrictEqual(fileContent, fakeBuffer);
  });
});

