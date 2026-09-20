import { UniversePresetId } from './universe';

/**
 * Anomaly Severity Levels
 */
export type AnomalySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Detected Cosmic Anomaly
 */
export interface CosmicAnomaly {
  id: string;
  title: string;
  description: string;
  severity: AnomalySeverity;
  sourceEntityId?: string;
  timestamp: number;
}

/**
 * Proactive Guardian Recommendation
 */
export interface GuardianRecommendation {
  id: string;
  title: string;
  text: string;
  suggestedActionName?: string;
  suggestedActionCommand?: string; // e.g. "ALIGN_ORBITS" or "SEED_ORGANISMS"
}

/**
 * Gravitational Event in the Cosmos
 */
export interface GravitationalEvent {
  type: 'SINGULARITY_FORMATION' | 'TIDAL_DISRUPTION' | 'HIGH_SHEAR_ACCRETION' | 'ORBITAL_RESONANCE' | 'SUPERNOVA_SHOCKWAVE';
  description: string;
  severity: AnomalySeverity;
  origin?: { x: number; y: number; z: number };
}

/**
 * Spatial Energy Hotspot
 */
export interface EnergyHotspot {
  name: string;
  position: { x: number; y: number; z: number };
  energyDensity: number;
  dominantSource?: string;
}

/**
 * Compact Aggregated Universe Telemetry Summary
 * Sent to AETHER AI Guardian instead of raw particle arrays
 */
export interface UniverseTelemetrySummary {
  epochTime: number; // Simulation time in seconds
  tickCount: number;
  timeScale: number;
  isPaused: boolean;
  activePreset: UniversePresetId;
  gravityConstant: number;

  // Stability Index (0 - 100%)
  stabilityScore: number;
  stabilityStatus: 'STABLE' | 'MODERATE_FLUCTUATION' | 'CRITICAL_INSTABILITY';
  stabilityFactors: {
    velocityDispersion: number;
    gravitationalStress: number;
    orbitalDecayRisk: number;
    boundaryPressure: number;
  };

  // Entity Counts
  entityCounts: {
    stars: number;
    planets: number;
    blackHoles: number;
    asteroids: number;
    nebulae: number;
    energyFields: number;
    totalCelestial: number;
  };

  // Detailed Planet List
  planetSummary: Array<{
    id: string;
    name: string;
    radius: number;
    mass: number;
    orbitalRadius?: number;
    orbitalSpeed?: number;
    color: string;
  }>;

  // Energy Statistics
  energyStats: {
    totalCelestialEnergy: number;
    totalParticleEnergy: number;
    averageParticleEnergy: number;
    highestEnergyRegion: EnergyHotspot;
  };

  // Ecosystem Vital Signs
  ecosystem: {
    population: number;
    matterCount: number;
    energyCount: number;
    births: number;
    deaths: number;
    averageEnergy: number;
    averageAge: number;
    averageHealth: number;
    growthRate: number;
  };

  // Active Anomalies & Events
  anomalies: CosmicAnomaly[];
  gravitationalEvents: GravitationalEvent[];
  recommendations: GuardianRecommendation[];
}

/**
 * AETHER Guardian Query Response
 */
export interface AetherQueryResponse {
  question: string;
  answer: string;
  reasoning: string;
  metrics?: Record<string, any>;
  suggestedAction?: {
    label: string;
    actionCommand: string;
    payload?: any;
  };
}
