import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { config } from './config';
import { ApiError } from './middleware/auth';
import { EXT, detectImageType } from './lib/files';
import { Report, Task, Upload } from './models';
import { aiCapability } from './services/ai';
import { imageryCapability } from './services/imagery';
import { routingCapability } from './services/routing';
import { readImage } from './services/storage';
import { authRouter } from './routes/auth';
import { reportsRouter } from './routes/reports';
import { tasksRouter } from './routes/tasks';
import { analyticsRouter, imageryRouter, notificationsRouter, routingRouter, usersRouter } from './routes/misc';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ error: tooBig ? `Image is too large (max ${config.maxUploadMb} MB)` : `Upload error: ${err.message}` });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  if (err?.name === 'ValidationError' || err?.name === 'CastError') return res.status(400).json({ error: 'Invalid data' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
};

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'], connectSrc: ["'self'"], objectSrc: ["'none'"],
        'upgrade-insecure-requests': null,
      },
    },
  }));
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/uploads/:name', async (req, res, next) => {
    try {
      const image = await readImage(req.params.name);
      if (!image) return res.sendStatus(404);
      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.send(image.data);
    } catch (error) {
      return next(error);
    }
  });
  app.use('/uploads', express.static(config.uploadDir, { setHeaders: (r) => r.setHeader('X-Content-Type-Options', 'nosniff') }));

  // Temporary, token-guarded recovery hook. Disabled unless explicitly enabled in Render.
  const uploadRestoreToken = process.env.UPLOAD_RESTORE_TOKEN;
  app.put('/api/internal/restore-upload/:name', express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp'],
    limit: `${config.maxUploadMb}mb`,
  }), async (req, res, next) => {
    try {
      if (!uploadRestoreToken || req.get('authorization') !== `Bearer ${uploadRestoreToken}`) return res.sendStatus(404);
      const name = req.params.name;
      if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name) || !Buffer.isBuffer(req.body)) return res.sendStatus(400);
      const mime = detectImageType(req.body);
      if (!mime || `${name.split('.').pop()}` !== EXT[mime]) return res.sendStatus(400);
      const photoPath = `/uploads/${name}`;
      const referenced = await Report.exists({ photoUrl: photoPath })
        || await Task.exists({ $or: [{ beforePhotoUrl: photoPath }, { afterPhotoUrl: photoPath }] });
      if (!referenced) return res.sendStatus(404);
      await Upload.updateOne({ filename: name }, { contentType: mime, data: req.body }, { upsert: true });
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  // Booleans/labels only — never keys. Lets the UI label demo/simulated/unavailable states honestly.
  app.get('/api/capabilities', (_req, res) => res.json({ ai: aiCapability(), routing: routingCapability(), imagery: imageryCapability() }));

  app.use('/api/auth', authRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/routes', routingRouter);
  app.use('/api/imagery', imageryRouter);
  app.use('/api/users', usersRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
