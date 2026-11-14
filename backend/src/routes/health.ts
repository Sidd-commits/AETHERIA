import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'healthy',
    service: 'aetheria-backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024))
    }
  });
});
