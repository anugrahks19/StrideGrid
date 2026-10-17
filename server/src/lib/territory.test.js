import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTerritory } from './territory.js';

test('a rival contests then captures; owner can defend', () => {
  const now = new Date('2026-10-17T00:00:00Z');
  const claimed = nextTerritory(null, 'runner-a', now);
  assert.equal(claimed.action, 'claimed');
  const contested = nextTerritory(claimed, 'runner-b', now);
  assert.equal(contested.action, 'contested');
  assert.equal(nextTerritory(contested, 'runner-a', now).action, 'defended');
  const captured = nextTerritory(contested, 'runner-b', now);
  assert.equal(captured.action, 'captured');
  assert.equal(captured.owner, 'runner-b');
  assert.equal(nextTerritory(contested, 'runner-b', new Date('2026-10-25T00:00:00Z')).action, 'contested');
});
