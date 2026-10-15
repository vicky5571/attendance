import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { detectFace } from '../src/lib/services/face-detection.ts';

describe('Biometric Face Detection Service', () => {
  test('should detect human face in a portrait image with skin tones and facial feature variance', async () => {
    // Generate an image buffer resembling a face: 200x200 with skin tone base and darker facial features (eyes/mouth)
    const baseWidth = 240;
    const baseHeight = 280;

    // Create SVG with skin tone oval and eyes/eyebrows/mouth features
    const faceSvg = `
      <svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="100%" height="100%" fill="#E0E0E0"/>
        <!-- Face oval (human skin tone RGB: 215, 162, 130) -->
        <ellipse cx="120" cy="140" rx="75" ry="95" fill="#D7A282"/>
        <!-- Left eye -->
        <ellipse cx="95" cy="120" rx="12" ry="7" fill="#2C1D11"/>
        <!-- Right eye -->
        <ellipse cx="145" cy="120" rx="12" ry="7" fill="#2C1D11"/>
        <!-- Eyebrows -->
        <rect x="80" y="105" width="28" height="5" fill="#1C120C" rx="2"/>
        <rect x="132" y="105" width="28" height="5" fill="#1C120C" rx="2"/>
        <!-- Nose bridge -->
        <line x1="120" y1="125" x2="117" y2="150" stroke="#B87B5C" stroke-width="3"/>
        <!-- Mouth / Lips -->
        <ellipse cx="120" cy="180" rx="22" ry="8" fill="#A84C52"/>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(faceSvg)).jpeg({ quality: 90 }).toBuffer();

    const result = await detectFace(buffer);
    assert.strictEqual(result.detected, true, `Expected face to be detected, got: ${result.reason}`);
    assert.ok(result.metrics, 'Metrics should be provided');
    assert.ok(result.metrics.skinRatio > 0.15, `Skin ratio should be significant: ${result.metrics.skinRatio}`);
    assert.ok(result.metrics.variance > 15, `Variance should capture facial features: ${result.metrics.variance}`);
  });

  test('should reject image with dimensions smaller than 150x150 px', async () => {
    const smallBuffer = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: { r: 215, g: 162, b: 130 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await detectFace(smallBuffer);
    assert.strictEqual(result.detected, false);
    assert.match(result.reason || '', /resolusi/i);
  });

  test('should reject image with extreme aspect ratio', async () => {
    const wideBuffer = await sharp({
      create: {
        width: 450,
        height: 180,
        channels: 3,
        background: { r: 215, g: 162, b: 130 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await detectFace(wideBuffer);
    assert.strictEqual(result.detected, false);
    assert.match(result.reason || '', /aspek rasio/i);
  });

  test('should reject image with no human skin tones (e.g. pure blue/green scenery)', async () => {
    const blueBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 20, g: 100, b: 230 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await detectFace(blueBuffer);
    assert.strictEqual(result.detected, false);
    assert.match(result.reason || '', /warna kulit|karakteristik wajah/i);
  });

  test('should reject flat solid color image without facial contrast/variance', async () => {
    // Pure flat solid skin tone color without any eyes, mouth, or facial features
    const flatSkinBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 215, g: 162, b: 130 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await detectFace(flatSkinBuffer);
    assert.strictEqual(result.detected, false);
    assert.match(result.reason || '', /kontras|fitur wajah|variasi/i);
  });

  test('should gracefully handle invalid or corrupted non-image buffer', async () => {
    const corruptBuffer = Buffer.from('this is not an image');
    const result = await detectFace(corruptBuffer);
    assert.strictEqual(result.detected, false);
    assert.match(result.reason || '', /format|korup|tidak valid/i);
  });
});
