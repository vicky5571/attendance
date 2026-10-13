import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  submitRelocationRequest,
  reviewRelocationRequest,
  getRelocationRequests,
  getLatestRelocationRequest,
} from '../src/lib/services/relocation-service.ts';

describe('Office Relocation Request Service', () => {
  it('should validate mandatory target office and reason', async () => {
    const resNoTarget = await submitRelocationRequest({
      internId: 'test-intern-01',
      internName: 'Test Intern',
      currentOfficeId: 'loc-kppti',
      currentOfficeName: 'KPPTI Jakarta Pusat',
      targetOfficeId: '',
      targetOfficeName: '',
      reason: 'Pindah kerja',
    });
    assert.equal(resNoTarget.success, false);
    assert.match(resNoTarget.error || '', /kantor tujuan/i);

    const resSameOffice = await submitRelocationRequest({
      internId: 'test-intern-01',
      internName: 'Test Intern',
      currentOfficeId: 'loc-kppti',
      currentOfficeName: 'KPPTI Jakarta Pusat',
      targetOfficeId: 'loc-kppti',
      targetOfficeName: 'KPPTI Jakarta Pusat',
      reason: 'Pindah kerja',
    });
    assert.equal(resSameOffice.success, false);
    assert.match(resSameOffice.error || '', /tidak boleh sama/i);

    const resNoReason = await submitRelocationRequest({
      internId: 'test-intern-01',
      internName: 'Test Intern',
      currentOfficeId: 'loc-kppti',
      currentOfficeName: 'KPPTI Jakarta Pusat',
      targetOfficeId: 'loc-bsd',
      targetOfficeName: 'Gedung Indosat BSD',
      reason: '   ',
    });
    assert.equal(resNoReason.success, false);
    assert.match(resNoReason.error || '', /alasan pindah/i);
  });

  it('should create relocation request with PENDING status when valid', async () => {
    const res = await submitRelocationRequest({
      internId: 'intern-zacky-test',
      internName: 'Zacky Kurniawan',
      currentOfficeId: 'loc-kppti',
      currentOfficeName: 'KPPTI Jakarta Pusat',
      targetOfficeId: 'loc-bsd',
      targetOfficeName: 'Gedung Indosat BSD',
      reason: 'Dekat dengan domisili baru',
      notes: 'Disetujui mentor',
    });

    assert.equal(res.success, true);
    assert.ok(res.request);
    assert.equal(res.request?.status, 'PENDING');
    assert.equal(res.request?.targetOfficeName, 'Gedung Indosat BSD');
  });

  it('should prevent multiple pending requests for the same intern', async () => {
    const duplicate = await submitRelocationRequest({
      internId: 'intern-zacky-test',
      internName: 'Zacky Kurniawan',
      currentOfficeId: 'loc-kppti',
      currentOfficeName: 'KPPTI Jakarta Pusat',
      targetOfficeId: 'loc-bsd',
      targetOfficeName: 'Gedung Indosat BSD',
      reason: 'Mencoba submit lagi',
    });

    assert.equal(duplicate.success, false);
    assert.match(duplicate.error || '', /menunggu persetujuan/i);
  });

  it('should approve relocation request and update status', async () => {
    const requests = await getRelocationRequests('intern-zacky-test');
    assert.ok(requests.length > 0);
    const targetId = requests[0].id;

    const reviewRes = await reviewRelocationRequest(targetId, 'APPROVED', 'Administrator IOH');
    assert.equal(reviewRes.success, true);

    const updated = await getLatestRelocationRequest('intern-zacky-test');
    assert.equal(updated?.status, 'APPROVED');
    assert.equal(updated?.reviewedBy, 'Administrator IOH');
  });
});
