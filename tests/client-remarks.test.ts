import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLiveRemarkPreview,
  timeStringToMinutes,
} from '../src/lib/client-remarks.ts';

describe('Dynamic Client Remarks Evaluator', () => {
  it('should parse time strings to minutes correctly', () => {
    assert.equal(timeStringToMinutes('08:30'), 510);
    assert.equal(timeStringToMinutes('17:30'), 1050);
    assert.equal(timeStringToMinutes('00:00'), 0);
  });

  describe('Check-In Live Preview', () => {
    it('should preview "Tepat Waktu" when checking in on or before start time', () => {
      const previewOnTime = computeLiveRemarkPreview('08:25', false, false, '08:30', '17:30');
      assert.equal(previewOnTime.type, 'CHECK_IN');
      assert.equal(previewOnTime.isViolated, false);
      assert.equal(previewOnTime.remarks, 'Tepat Waktu');
      assert.equal(previewOnTime.badgeColor, 'emerald');

      const previewExact = computeLiveRemarkPreview('08:30', false, false, '08:30', '17:30');
      assert.equal(previewExact.isViolated, false);
      assert.equal(previewExact.remarks, 'Tepat Waktu');
    });

    it('should preview "Terlambat X menit" when checking in after start time', () => {
      const previewLate = computeLiveRemarkPreview('08:45', false, false, '08:30', '17:30');
      assert.equal(previewLate.type, 'CHECK_IN');
      assert.equal(previewLate.isViolated, true);
      assert.equal(previewLate.remarks, 'Terlambat 15 menit');
      assert.equal(previewLate.badgeColor, 'amber');
    });
  });

  describe('Check-Out Live Preview', () => {
    it('should preview early departure when checking out before end time', () => {
      const previewEarly = computeLiveRemarkPreview('17:00', true, false, '08:30', '17:30');
      assert.equal(previewEarly.type, 'CHECK_OUT');
      assert.equal(previewEarly.isViolated, true);
      assert.equal(previewEarly.remarks, 'Pulang sebelum waktu kerja: lebih awal 30 menit');
      assert.equal(previewEarly.badgeColor, 'amber');
    });

    it('should preview "Tepat Waktu" when checking out on or after end time', () => {
      const previewOnTime = computeLiveRemarkPreview('17:35', true, false, '08:30', '17:30');
      assert.equal(previewOnTime.type, 'CHECK_OUT');
      assert.equal(previewOnTime.isViolated, false);
      assert.equal(previewOnTime.remarks, 'Tepat Waktu');
      assert.equal(previewOnTime.badgeColor, 'emerald');
    });
  });

  describe('Completed State', () => {
    it('should return completed status when already checked out', () => {
      const previewDone = computeLiveRemarkPreview('18:00', true, true, '08:30', '17:30');
      assert.equal(previewDone.type, 'COMPLETED');
      assert.equal(previewDone.isViolated, false);
      assert.equal(previewDone.remarks, 'Presensi Hari Ini Selesai');
    });
  });
});
