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
    const sanitizedQuery = query.replace(/[^\x20-\x7E]/g, '').trim().slice(0, 200);
    const rawParticles =
      telemetry?.particleCount != null ? Number(telemetry.particleCount) : NaN;
    const rawFps = telemetry?.fps != null ? Number(telemetry.fps) : NaN;
    const particleCount = Number.isFinite(rawParticles) ? rawParticles : 10000;
    const fps = Number.isFinite(rawFps) ? rawFps : 60;

    const diagnostics: string[] = [];
    if (Number.isFinite(Number(telemetry?.stabilityScore))) {
      diagnostics.push(`Stability Index: ${Number(telemetry?.stabilityScore)}%`);
    }
    if (Number.isFinite(Number(telemetry?.gravityConstant))) {
      diagnostics.push(`Gravity Constant: ${Number(telemetry?.gravityConstant).toFixed(2)} G`);
    }
    if (Number.isFinite(Number(telemetry?.blackHoles)) && Number(telemetry?.blackHoles) > 0) {
      diagnostics.push(`Active Singularities: ${Number(telemetry?.blackHoles)}`);
    }

    const diagSummary = diagnostics.length > 0 ? ` (${diagnostics.join(', ')})` : '';
    const answer = `[AETHER Guardian Advisor] Simulation running at ${fps} FPS across ${particleCount} active celestial particles${diagSummary}. Query evaluated: "${sanitizedQuery}". Gravitational tensors ${Number(telemetry?.stabilityScore) < 50 ? 'show elevated tidal shear' : 'remain within equilibrium'}.`;

    res.json({
      success: true,
      query: sanitizedQuery,
      answer,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});
