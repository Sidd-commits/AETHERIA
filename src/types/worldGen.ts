/**
 * Types & Schema Definitions for Natural-Language Procedural World Generation
 */

export interface UniverseConfiguration {
  theme: 'peaceful' | 'chaotic' | 'harmonic' | 'nebular' | 'void' | 'cosmic' | string;
  colorPalette: 'blue' | 'purple' | 'cyan' | 'green' | 'amber' | 'spectrum' | 'magenta' | 'solar' | string;
  stars: number;
  planets?: number;
  blackHoles: number;
  gravity: number;
  energyDensity: number;
  formationRate: number;
  asteroidBelts?: number;
  seedOrganisms?: boolean;
  prompt?: string;
  timestamp?: number;
}

export interface WorldGenValidationResult {
  isValid: boolean;
  sanitizedConfig: UniverseConfiguration;
  errors: string[];
  warnings: string[];
  securityVerified: boolean; // Confirms 0 executable JavaScript / pure JSON schema
}

export interface WorldGenResult {
  config: UniverseConfiguration;
  validation: WorldGenValidationResult;
  entitiesGenerated: {
    stars: number;
    planets: number;
    blackHoles: number;
    asteroids: number;
    nebulae: number;
    energyFields: number;
    organisms: number;
  };
  totalParticles: number;
  paletteName: string;
  generationEpoch: number;
}

export interface WorldGenPresetPrompt {
  id: string;
  title: string;
  prompt: string;
  icon: string;
  tag: string;
}

export const CURATED_WORLD_GEN_PROMPTS: WorldGenPresetPrompt[] = [
  {
    id: 'peaceful_blue_3suns_blackhole',
    title: 'Peaceful Trinary Abyss',
    prompt: 'A peaceful blue universe with three suns and a giant black hole in the center.',
    icon: '🌌',
    tag: 'Peaceful / Cyan'
  },
  {
    id: 'chaotic_rapid_stars_gravity',
    title: 'High-Gravity Stellar Forge',
    prompt: 'Create a chaotic universe with high gravity and rapidly forming stars.',
    icon: '💥',
    tag: 'Chaotic / High G'
  },
  {
    id: 'harmonic_emerald_sanctuary',
    title: 'Emerald Bio-Sanctuary',
    prompt: 'A peaceful emerald sanctuary with 2 stars, gentle gravity, and teeming organism life.',
    icon: '🌿',
    tag: 'Ecosystem / Green'
  },
  {
    id: 'solar_tranquil_system',
    title: 'Tranquil Solar Haven',
    prompt: 'A serene solar system with a radiant golden sun, 6 colorful planets, and peaceful asteroid rings.',
    icon: '☀️',
    tag: 'Solar / Harmonious'
  },
  {
    id: 'void_dual_singularities',
    title: 'Deep Ultraviolet Dual Void',
    prompt: 'A dark purple void with two supermassive black holes, high energy density, and turbulent accretion discs.',
    icon: '🕳️',
    tag: 'Singularity / Void'
  },
  {
    id: 'prismatic_nebula_burst',
    title: 'Prismatic Hyper-Nebula',
    prompt: 'A vibrant rainbow prismatic universe with rapidly forming stars, high energy density, and dense asteroid clusters.',
    icon: '✨',
    tag: 'Nebular / Prismatic'
  }
];
