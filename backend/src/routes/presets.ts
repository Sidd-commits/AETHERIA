import { Router, Request, Response } from 'express';

export const presetsRouter = Router();

const PRESETS = [
  {
    id: 'binary-pulsar',
    name: 'Binary Pulsar Vortex',
    description: 'Two ultra-dense gravitational attractors locked in an energetic orbital dance.',
    config: {
      theme: 'chaotic',
      colorPalette: 'fire',
      stars: 2,
      planets: 4,
      blackHoles: 0,
      gravity: 2.4,
      energyDensity: 0.9,
      formationRate: 0.8
    }
  },
  {
    id: 'peaceful-oasis',
    name: 'Calm Stellar Oasis',
    description: 'A serene azure universe with gentle planetary drift and high stability.',
    config: {
      theme: 'peaceful',
      colorPalette: 'blue',
      stars: 3,
      planets: 8,
      blackHoles: 0,
      gravity: 0.8,
      energyDensity: 0.3,
      formationRate: 0.2
    }
  },
  {
    id: 'supermassive-singularity',
    name: 'Galactic Core Singularity',
    description: 'A supermassive black hole surrounded by orbiting star clusters and accretion discs.',
    config: {
      theme: 'void',
      colorPalette: 'void',
      stars: 6,
      planets: 12,
      blackHoles: 1,
      gravity: 1.8,
      energyDensity: 0.7,
      formationRate: 0.5
    }
  },
  {
    id: 'aurora-nursery',
    name: 'Aurora Stellar Nursery',
    description: 'Vibrant interstellar cloud actively condensing into proto-planetary systems.',
    config: {
      theme: 'nebular',
      colorPalette: 'aurora',
      stars: 4,
      planets: 6,
      blackHoles: 0,
      gravity: 1.1,
      energyDensity: 0.6,
      formationRate: 0.7
    }
  }
];

presetsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: PRESETS.length,
    presets: PRESETS
  });
});
