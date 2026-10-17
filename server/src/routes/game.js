import { Router } from 'express';
import { createHash } from 'node:crypto';
import Territory from '../models/Territory.js';
import Run from '../models/Run.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { cellBounds, routeCells, validateRun } from '../lib/geo.js';
import { nextTerritory } from '../lib/territory.js';
import { announceRun, liveEvents } from '../lib/live.js';

const router = Router();
router.get('/events', liveEvents);

async function applyVisit(cell, runnerId, now) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await Territory.findOne({ key: cell.key });
    const transition = nextTerritory(current, runnerId, now);
    if (transition.action === 'unchanged') return transition.action;
    if (!current) {
      try {
        await Territory.create({ key: cell.key, x: cell.x, y: cell.y, ...transition, action: undefined });
        return transition.action;
      } catch (error) {
        if (error.code === 11000) continue;
        throw error;
      }
    }
    const { action, ...fields } = transition;
    const updated = await Territory.findOneAndUpdate(
      { _id: current._id, __v: current.__v },
      { $set: fields, $inc: { __v: 1 } },
      { new: true },
    );
    if (updated) return action;
  }
  throw new Error('Territory changed while the run was being processed. Please retry.');
}

router.get('/territories', async (req, res, next) => {
  try {
    const docs = await Territory.find().select('-__v').populate('owner', 'name').populate('challenger', 'name').limit(5000);
    res.json({ territories: docs.map((doc) => ({
      key: doc.key,
      bounds: cellBounds(doc.x, doc.y),
      owner: doc.owner ? { id: doc.owner.id, name: doc.owner.name } : null,
      challenger: doc.challenger ? { id: doc.challenger.id, name: doc.challenger.name } : null,
      challengeExpiresAt: doc.challengeExpiresAt,
    })) });
  } catch (error) { next(error); }
});

router.get('/leaderboard', async (_req, res, next) => {
  try {
    const leaders = await Territory.aggregate([
      { $group: { _id: '$owner', cells: { $sum: 1 } } },
      { $sort: { cells: -1 } }, { $limit: 10 },
    ]);
    const users = await User.find({ _id: { $in: leaders.map((row) => row._id) } }).select('name');
    const names = new Map(users.map((user) => [String(user._id), user.name]));
    res.json({ leaders: leaders.map((row, index) => ({
      rank: index + 1, userId: String(row._id), name: names.get(String(row._id)) || 'Runner', cells: row.cells,
    })) });
  } catch (error) { next(error); }
});

router.get('/activity', async (_req, res, next) => {
  try {
    const runs = await Run.find({ status: 'completed' })
      .sort({ endedAt: -1 }).limit(8)
      .select('runner claimedCount contestedCount capturedCount defendedCount endedAt')
      .populate('runner', 'name');
    res.json({ activity: runs.map((run) => ({
      id: run.id,
      runner: run.runner?.name || 'Runner',
      claimed: run.claimedCount,
      contested: run.contestedCount,
      captured: run.capturedCount,
      defended: run.defendedCount,
      at: run.endedAt,
    })) });
  } catch (error) { next(error); }
});

router.get('/runs', requireAuth, async (req, res, next) => {
  try {
    const runs = await Run.find({ runner: req.user._id, status: 'completed' }).sort({ startedAt: -1 }).limit(30);
    res.json({ runs });
  } catch (error) { next(error); }
});

router.post('/runs', requireAuth, async (req, res, next) => {
  try {
    let validated;
    try { validated = validateRun(req.body.points); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const cells = routeCells(validated.points);
    if (cells.length === 0) return res.status(400).json({ error: 'The route did not pass through enough territory.' });
    const routeHash = createHash('sha256').update(String(req.user._id)).update(JSON.stringify(validated.points)).digest('hex');
    let run;
    try {
      run = await Run.create({
        runner: req.user._id,
        routeHash,
        points: validated.points,
        distanceMeters: validated.distanceMeters,
        durationSeconds: validated.durationSeconds,
        startedAt: new Date(validated.points[0].timestamp),
        endedAt: new Date(validated.points.at(-1).timestamp),
      });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'This run has already been submitted.' });
      throw error;
    }
    const counts = { claimed: 0, contested: 0, captured: 0, defended: 0 };
    const now = new Date();
    for (const cell of cells) {
      const action = await applyVisit(cell, req.user._id, now);
      if (counts[action] !== undefined) counts[action] += 1;
    }
    run.set({
      status: 'completed',
      claimedCount: counts.claimed,
      contestedCount: counts.contested,
      capturedCount: counts.captured,
      defendedCount: counts.defended,
    });
    await run.save();
    announceRun();
    return res.status(201).json({ run: {
      id: run.id,
      distanceMeters: run.distanceMeters,
      durationSeconds: run.durationSeconds,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      ...counts,
    }, counts });
  } catch (error) { next(error); }
});

export default router;
