import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initCronScheduler, DEFAULT_CRON_SCHEDULE } from '../src/lib/cron/scheduler.ts';

describe('Scheduled Background Cron Trigger', () => {
  it('should initialize cron task with 18:00 WIB daily schedule', () => {
    assert.equal(DEFAULT_CRON_SCHEDULE, '0 18 * * *');

    let invoked = false;
    const task = initCronScheduler(async () => {
      invoked = true;
    });

    assert.ok(task);
    assert.equal(typeof task.stop, 'function');
    assert.equal(typeof task.start, 'function');

    // Clean up
    task.stop();
  });

  it('should execute callback when manually triggered', async () => {
    let callCount = 0;
    const task = initCronScheduler(async () => {
      callCount++;
    });

    // Directly trigger execution handler
    await task.triggerNow();
    assert.equal(callCount, 1);

    task.stop();
  });
});
