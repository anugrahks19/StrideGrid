import test from 'node:test';
import assert from 'node:assert/strict';
import { demoData } from './demo.js';

test('evaluator sample data is coherent and contains no private route points', () => {
  const userId = 'evaluator-user';
  const { territories, leaders, runs, activity } = demoData(userId);
  assert.equal(new Set(territories.map((cell) => cell.key)).size, territories.length);
  assert.equal(territories.filter((cell) => cell.owner.id === userId).length, leaders[0].cells);
  assert.equal(territories.filter((cell) => cell.owner.id === leaders[1].userId).length, leaders[1].cells);
  assert.equal(runs.length, 3);
  assert.ok(runs.every((run) => run.distanceMeters > 1000 && !('points' in run)));
  assert.equal(activity.length, runs.length);
  assert.ok(territories.some((cell) => cell.challenger && cell.challengeExpiresAt > new Date()));
});
