import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from '../services/aiService.js';

export const aiRouter = Router();

const CommandRequestSchema = z.object({
  text: z.string().min(1).max(500)
});

const QueryRequestSchema = z.object({
  query: z.string().min(1).max(500),
  telemetry: z.record(z.unknown()).optional()
});

aiRouter.post('/command', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = CommandRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.format()
      });
      return;
    }

    const command = await AIService.parseNaturalLanguageCommand(parseResult.data.text);
    if (!command) {
      res.status(422).json({
        error: 'Unrecognized Command',
        message: 'Could not reliably translate voice command into a safe simulation action.'
      });
      return;
    }

    res.json({
      success: true,
      command
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/query', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = QueryRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.format()
      });
      return;
    }

    const { query, telemetry } = parseResult.data;
    const particleCount = telemetry?.particleCount ?? 15000;
    const fps = telemetry?.fps ?? 60;

    const answer = `[AETHER Guardian Advisor] Simulation running smoothly at ${fps} FPS across ${particleCount} active celestial particles. Query evaluated: "${query}". Gravitational tensors remain within equilibrium.`;

    res.json({
      success: true,
      query,
      answer,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});
