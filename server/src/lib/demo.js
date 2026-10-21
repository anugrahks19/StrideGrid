import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { cellBounds, pointToCell } from './geo.js';

export const DEMO_EMAIL = 'evaluator-demo@stridegrid.invalid';

export async function ensureDemoUser() {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    if (!existing.isDemo) throw new Error('The reserved evaluator account is already in use.');
    return existing;
  }
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  try {
    return await User.create({ name: 'Demo Runner', email: DEMO_EMAIL, passwordHash, isDemo: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const user = await User.findOne({ email: DEMO_EMAIL, isDemo: true });
    if (!user) throw error;
    return user;
  }
}

function daysAgo(days, hour = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date;
}

export function demoData(userId) {
  const base = pointToCell({ lat: 10.5276, lng: 76.2144 });
  const rivalId = 'sample-rival';
  const cells = [
    [0, 0, true], [1, 0, true], [2, 0, true], [3, 0, false],
    [0, 1, true], [1, 1, true], [2, 1, true], [3, 1, false],
    [0, 2, true], [1, 2, true], [2, 2, false], [3, 2, false],
  ];
  const territories = cells.map(([dx, dy, mine], index) => {
    const x = base.x + dx;
    const y = base.y + dy;
    const bounds = cellBounds(x, y);
    return {
      key: `${x}:${y}`,
      bounds,
      marker: [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2],
      owner: mine ? { id: userId, name: 'Demo Runner' } : { id: rivalId, name: 'Alex' },
      challenger: index === 5 ? { id: rivalId, name: 'Alex' } : null,
      challengeExpiresAt: index === 5 ? new Date(Date.now() + 5 * 86400_000) : null,
    };
  });
  const runDetails = [
    { days: 1, distanceMeters: 3420, durationSeconds: 1830, claimedCount: 3, contestedCount: 1, capturedCount: 0, defendedCount: 1 },
    { days: 3, distanceMeters: 2180, durationSeconds: 1190, claimedCount: 2, contestedCount: 0, capturedCount: 1, defendedCount: 0 },
    { days: 6, distanceMeters: 4070, durationSeconds: 2250, claimedCount: 3, contestedCount: 1, capturedCount: 0, defendedCount: 0 },
  ];
  const runs = runDetails.map(({ days, ...details }, index) => {
    const startedAt = daysAgo(days);
    return {
      _id: `sample-run-${index + 1}`,
      status: 'completed',
      startedAt,
      endedAt: new Date(startedAt.getTime() + details.durationSeconds * 1000),
      ...details,
    };
  });
  const activity = runs.map((run) => ({
    id: run._id,
    runner: 'Demo Runner',
    claimed: run.claimedCount,
    contested: run.contestedCount,
    captured: run.capturedCount,
    defended: run.defendedCount,
    at: run.endedAt,
  }));
  return {
    territories,
    leaders: [
      { rank: 1, userId, name: 'Demo Runner', cells: 8 },
      { rank: 2, userId: rivalId, name: 'Alex', cells: 4 },
    ],
    runs,
    activity,
  };
}
