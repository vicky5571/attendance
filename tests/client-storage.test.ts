import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveAttendanceCache,
  getAttendanceCache,
  saveSelectedInternId,
  getSelectedInternId,
  clearAllMemoryCache,
} from '../src/lib/client-storage.ts';

describe('Client Storage & Offline Caching Helper', () => {
  beforeEach(() => {
    clearAllMemoryCache();
  });

  it('should return null when no cache exists for intern and date', () => {
    const cached = getAttendanceCache('intern-sarah', '2026-10-08');
    assert.equal(cached, null);
  });

  it('should persist and retrieve attendance status cache', () => {
    saveAttendanceCache('intern-sarah', '2026-10-08', {
      in: '08:15',
      remarks: 'Tepat Waktu',
    });

    const cached = getAttendanceCache('intern-sarah', '2026-10-08');
    assert.ok(cached !== null);
    assert.equal(cached?.in, '08:15');
    assert.equal(cached?.remarks, 'Tepat Waktu');
    assert.ok(Boolean(cached?.updatedAt));
  });

  it('should update existing cache with check-out information', () => {
    saveAttendanceCache('intern-sarah', '2026-10-08', {
      in: '08:15',
    });

    saveAttendanceCache('intern-sarah', '2026-10-08', {
      in: '08:15',
      out: '17:35',
      remarks: 'Tepat Waktu',
    });

    const cached = getAttendanceCache('intern-sarah', '2026-10-08');
    assert.equal(cached?.in, '08:15');
    assert.equal(cached?.out, '17:35');
    assert.equal(cached?.remarks, 'Tepat Waktu');
  });

  it('should remember and retrieve selected intern ID', () => {
    assert.equal(getSelectedInternId('intern-default'), 'intern-default');

    saveSelectedInternId('intern-budi');
    assert.equal(getSelectedInternId('intern-default'), 'intern-budi');
  });
});
