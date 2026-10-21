import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies.stridegrid_session;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.sub);
    }
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    next();
  });
}
