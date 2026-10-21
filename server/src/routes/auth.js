import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { DEMO_EMAIL } from '../lib/demo.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 86400_000,
});

function setSession(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('stridegrid_session', token, cookieOptions());
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 40 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ error: 'Enter a name, valid email, and password of at least 8 characters.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    setSession(res, user);
    return res.status(201).json({ user: user.toPublicJSON() });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    setSession(res, user);
    return res.json({ user: user.toPublicJSON() });
  } catch (error) { next(error); }
});

router.post('/demo', authLimiter, async (_req, res, next) => {
  try {
    const user = await User.findOne({ email: DEMO_EMAIL, isDemo: true });
    if (!user) return res.status(503).json({ error: 'The evaluator demo is temporarily unavailable.' });
    setSession(res, user);
    return res.json({ user: user.toPublicJSON() });
  } catch (error) { next(error); }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('stridegrid_session', { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublicJSON() }));

export default router;
