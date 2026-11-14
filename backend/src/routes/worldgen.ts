import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WorldgenService, UniverseConfigSchema } from '../services/worldgenService.js';

export const worldgenRouter = Router();

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(1000)
});

worldgenRouter.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = GenerateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.format()
      });
      return;
    }

    const config = await WorldgenService.parsePromptToConfig(parseResult.data.prompt);
    const validation = UniverseConfigSchema.safeParse(config);

    if (!validation.success) {
      res.status(500).json({
        error: 'World Generation Validation Failure',
        details: validation.error.format()
      });
      return;
    }

    res.json({
      success: true,
      prompt: parseResult.data.prompt,
      config: validation.data
    });
  } catch (err) {
    next(err);
  }
});
