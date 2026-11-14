import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { securityHeaders, rateLimiter, errorHandler } from './middleware/security.js';
import { healthRouter } from './routes/health.js';
import { aiRouter } from './routes/ai.js';
import { worldgenRouter } from './routes/worldgen.js';
import { presetsRouter } from './routes/presets.js';

export function createApp() {
  const app = express();

  // Allow trusted proxies
  app.set('trust proxy', 1);

  // Security headers & body parsing
  app.use(securityHeaders);
  app.use(express.json({ limit: '100kb' })); // Restrict payload size against memory exhaustion

  // CORS config
  const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('CORS origin rejected by security policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS']
    })
  );

  // Rate limiting
  app.use(rateLimiter);

  // Routes
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/worldgen', worldgenRouter);
  app.use('/api/presets', presetsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint Not Found' });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

// Start standalone server when executed directly
if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`🌌 AETHERIA Backend service running on http://localhost:${env.PORT}`);
    console.log(`🔒 Security standards active: CORS whitelist, rate limiting, no-eval command validation`);
  });
}
