// node --test mail-agent/schedule.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleConfig,
  zonedToUtc,
  withinRules,
  freeSlots,
  suggest,
  formatSlot,
} from './schedule.mjs';

const cfg = scheduleConfig({});
const sofia = (y, m, d, h, min = 0) => zonedToUtc(y, m - 1, d, h * 60 + min, 'Europe/Sofia');
// Mon 2 Nov 2026, 08:00 Sofia (UTC+2 after the October DST change).
const now = sofia(2026, 11, 2, 8);

test('Sofia wall-clock time converts to UTC on both sides of DST', () => {
  assert.equal(new Date(sofia(2026, 11, 2, 10)).toISOString(), '2026-11-02T08:00:00.000Z');
  assert.equal(new Date(sofia(2026, 7, 1, 10)).toISOString(), '2026-07-01T07:00:00.000Z');
});

test('rules: weekday lunch and evenings, Saturday morning, notice and window', () => {
  const t = (d, h, m) => withinRules(sofia(2026, 11, d, h, m), cfg, now);
  assert.equal(t(3, 13), true); // Tue lunch 13:00-13:30
  assert.equal(t(3, 13, 30), false); // would run past the lunch slot
  assert.equal(t(3, 10), false); // day job
  assert.equal(t(3, 18), false); // straight after work
  assert.equal(t(3, 18, 30), true);
  assert.equal(t(3, 20), true); // ends 20:30
  assert.equal(t(3, 20, 30), false);
  assert.equal(t(2, 18, 30), false); // 10.5h notice < 12h
  assert.equal(t(7, 10), true); // Saturday morning
  assert.equal(t(7, 11, 30), true); // ends 12:00
  assert.equal(t(7, 12), false);
  assert.equal(t(8, 10), false); // Sunday
  assert.equal(t(20, 18, 30), false); // beyond 14 days
});

test('busy time blocks the slot and the 15-minute buffer around it', () => {
  const busy = [{ start: sofia(2026, 11, 3, 18, 30), end: sofia(2026, 11, 3, 19) }];
  const slots = freeSlots(busy, cfg, now);
  assert.equal(slots.includes(sofia(2026, 11, 3, 18, 30)), false);
  assert.equal(slots.includes(sofia(2026, 11, 3, 19)), false); // starts right after
  assert.equal(slots.includes(sofia(2026, 11, 3, 19, 30)), true);
  assert.equal(slots.includes(sofia(2026, 11, 3, 13)), true);
});

test('suggestions: requested time status and one alternative per day', () => {
  const busy = [{ start: sofia(2026, 11, 4, 18, 30), end: sofia(2026, 11, 4, 20, 30) }];
  const taken = suggest(busy, cfg, now, sofia(2026, 11, 4, 19));
  assert.equal(taken.requested, 'unavailable');
  assert.equal(taken.slots.length, 3);
  const days = taken.slots.map((s) => new Date(s).toISOString().slice(0, 10));
  assert.equal(new Set(days).size, 3);

  assert.equal(suggest([], cfg, now, sofia(2026, 11, 4, 19)).requested, 'free');
  assert.equal(suggest([], cfg, now, sofia(2026, 11, 4, 15)).requested, 'outside_rules');
  assert.equal(suggest([], cfg, now, sofia(2026, 11, 8, 11)).requested, 'outside_rules');
  assert.equal(suggest([], cfg, now).requested, 'none');
});

test('settings come from the environment', () => {
  const custom = scheduleConfig({ MEETING_SCHEDULE: '1,3 18:00-20:00', MEETING_MINUTES: '45' });
  assert.deepEqual([...custom.hours.keys()], [1, 3]);
  assert.deepEqual(custom.hours.get(3), [[1080, 1200]]);
  assert.equal(custom.minutes, 45);
  assert.equal(formatSlot(sofia(2026, 11, 3, 18, 30), cfg), 'Tue 3 Nov, 18:30–19:00');
});
