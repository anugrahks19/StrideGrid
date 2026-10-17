import test from 'node:test';
import assert from 'node:assert/strict';
import { cellBounds, distanceMeters, pointToCell, routeCells, validateRun } from './geo.js';

test('cell projection round trips to bounds', () => {
  const point = { lat: 9.9312, lng: 76.2673 };
  const cell = pointToCell(point);
  const bounds = cellBounds(cell.x, cell.y);
  assert.ok(bounds[0][0] <= point.lat && point.lat <= bounds[1][0]);
  assert.ok(bounds[0][1] <= point.lng && point.lng <= bounds[1][1]);
});

test('a route crosses multiple cells', () => {
  const points = [
    { lat: 9.9312, lng: 76.2673 },
    { lat: 9.9312, lng: 76.2743 },
  ];
  assert.ok(distanceMeters(points[0], points[1]) > 700);
  assert.ok(routeCells(points).length > 3);
});

test('run validation accepts a plausible kilometer and filters one GPS jump', () => {
  const start = Date.now() - 12 * 60_000;
  const points = Array.from({ length: 13 }, (_, i) => ({
    lat: 9.9312,
    lng: 76.2673 + i * 0.00085,
    accuracy: 12,
    timestamp: start + i * 60_000,
  }));
  const baseline = validateRun(points).distanceMeters;
  assert.ok(baseline > 1000);
  points[5].lng += 0.1;
  assert.ok(Math.abs(validateRun(points).distanceMeters - baseline) < 5);
});

test('run validation rejects repeated implausible travel', () => {
  const start = Date.now() - 12 * 60_000;
  const points = Array.from({ length: 13 }, (_, i) => ({
    lat: 9.9312,
    lng: 76.2673 + i * 0.00085 + (i % 2 ? 0.1 : 0),
    accuracy: 12,
    timestamp: start + i * 60_000,
  }));
  assert.throws(() => validateRun(points));
});
