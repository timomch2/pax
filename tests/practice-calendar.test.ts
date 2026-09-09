import assert from 'node:assert/strict';
import test from 'node:test';
import { recurringDates, eventInputSchema, calendarFile, timeRangesOverlap } from '@/lib/practice-calendar';
import { moneyToMinor } from '@/lib/practice-money';

test('monthly recurrence uses Nairobi dates and recovers the original day after February', () => {
  const rows = recurringDates(new Date('2026-01-31T00:30:00+03:00'), new Date('2026-01-31T01:30:00+03:00'), { frequency: 'MONTHLY', until: '2026-03-31T23:59:59+03:00' });
  assert.deepEqual(rows.map((row) => row.startsAt.toISOString()), ['2026-01-30T21:30:00.000Z', '2026-02-27T21:30:00.000Z', '2026-03-30T21:30:00.000Z']);
  assert.ok(rows.every((row) => row.endsAt.getTime() - row.startsAt.getTime() === 3600000));
});
test('adjacent events are allowed but recurring self-overlap and excessive horizons are rejected', () => {
  assert.equal(timeRangesOverlap({ startsAt: new Date(0), endsAt: new Date(1000) }, { startsAt: new Date(1000), endsAt: new Date(2000) }), false);
  assert.throws(() => recurringDates(new Date('2026-01-01'), new Date('2026-01-03'), { frequency: 'DAILY', until: '2026-01-05T00:00:00Z' }), /overlap/);
  assert.throws(() => recurringDates(new Date('2026-01-01'), new Date('2026-01-02'), { frequency: 'WEEKLY', until: '2028-01-01T00:00:00Z' }), /one year/);
});
test('clinical event validation requires a patient and rejects billable general meetings', () => {
  const body = { title: 'Meeting', startsAt: '2026-09-09T10:00:00+03:00', endsAt: '2026-09-09T11:00:00+03:00' };
  assert.equal(eventInputSchema.safeParse({ ...body, kind: 'MEETING' }).success, true);
  assert.equal(eventInputSchema.safeParse({ ...body, kind: 'APPOINTMENT' }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...body, kind: 'MEETING', billable: true, serviceCode: 'Advice' }).success, false);
  assert.equal(eventInputSchema.safeParse({ ...body, kind: 'MEETING', meetingUrl: 'javascript:alert(1)' }).success, false);
});
test('calendar export excludes appointment titles and folds UTF-8 lines safely', () => {
  const value = calendarFile([{ id: 'example', kind: 'APPOINTMENT', title: 'Private patient name', startsAt: new Date('2026-09-09T00:00:00Z'), endsAt: new Date('2026-09-09T01:00:00Z'), location: 'É'.repeat(80), status: 'SCHEDULED', updatedAt: new Date('2026-09-01T00:00:00Z') }]);
  assert.ok(!value.includes('Private patient name'));
  assert.ok(value.includes('SUMMARY:Patient appointment'));
  assert.ok(value.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75));
});
test('clinical money input preserves cents exactly and rejects excess precision', () => {
  assert.equal(moneyToMinor('0.29'), 29);
  assert.equal(moneyToMinor('1020.5'), 102050);
  assert.throws(() => moneyToMinor('1.005'));
  assert.throws(() => moneyToMinor('-1'));
  assert.throws(() => moneyToMinor('20000000.01'));
});
