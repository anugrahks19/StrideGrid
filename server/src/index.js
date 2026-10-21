import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import { ensureDemoUser } from './lib/demo.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  // OSM raster tiles require a Referer; cross-origin requests share only this site's origin.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(express.json({ limit: '250kb' }));
app.use(cookieParser());
if (process.env.CLIENT_ORIGIN) {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', gameRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const port = Number(process.env.PORT) || 5000;
async function start() {
  let mongoUri = process.env.MONGODB_URI;
  if (process.env.NODE_ENV !== 'production' && !mongoUri) {
    const localData = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.local-data');
    const mongoPath = path.join(localData, 'mongo');
    await mkdir(mongoPath, { recursive: true });
    if (!process.env.JWT_SECRET) {
      const secretPath = path.join(localData, 'dev-jwt-secret');
      try { process.env.JWT_SECRET = (await readFile(secretPath, 'utf8')).trim(); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        process.env.JWT_SECRET = randomBytes(32).toString('hex');
        await writeFile(secretPath, process.env.JWT_SECRET, { flag: 'wx' });
      }
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server-core');
    const memoryDb = await MongoMemoryServer.create({ instance: { dbPath: mongoPath, storageEngine: 'wiredTiger' } });
    mongoUri = memoryDb.getUri('stridegrid');
    console.log('Using local MongoDB data in .local-data/mongo.');
    process.on('SIGINT', async () => { await mongoose.disconnect(); await memoryDb.stop(); process.exit(0); });
  }
  if (!mongoUri || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error('Set MONGODB_URI and a JWT_SECRET of at least 24 characters.');
  }
  await mongoose.connect(mongoUri);
  await ensureDemoUser();
  app.listen(port, () => console.log(`StrideGrid server listening on port ${port}`));
}

start().catch((error) => {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
});
