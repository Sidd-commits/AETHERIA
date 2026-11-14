import { UniverseEngine } from '../universe/UniverseEngine';
import { CommandBus } from './CommandBus';

export type QualityPreset = 'AUTO' | 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface QualityProfile {
  name: string;
  particleCount: number;
  label: string;
  description: string;
}

export const QUALITY_PROFILES: Record<'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW', QualityProfile> = {
  ULTRA: {
    name: 'ULTRA',
    particleCount: 15000,
    label: 'Ultra (15,000)',
    description: 'Maximum density cosmic particle manifold & dense accretion disks'
  },
  HIGH: {
    name: 'HIGH',
    particleCount: 10000,
    label: 'High (10,000)',
    description: 'Optimal visual fidelity for high-performance laptops'
  },
  MEDIUM: {
    name: 'MEDIUM',
    particleCount: 6500,
    label: 'Medium (6,500)',
    description: 'Balanced performance for mid-range integrated GPUs'
  },
  LOW: {
    name: 'LOW',
    particleCount: 3500,
    label: 'Low (3,500)',
    description: 'Lightweight mode prioritizing high framerate on low-power devices'
  }
};

/**
 * Adaptive Dynamic Quality Scaler
 * Automatically adjusts active particle density and simulation workload based on realtime FPS.
 */
export class QualityScaler {
  private mode: QualityPreset = 'AUTO';
  private currentTier: 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  private universeEngine: UniverseEngine;
  private commandBus: CommandBus;

  // Hysteresis counters to avoid quality flapping
  private lowFpsCounter: number = 0;
  private highFpsCounter: number = 0;
  private readonly lowThresholdFps = 45;
  private readonly highThresholdFps = 58;

  constructor(universeEngine: UniverseEngine, commandBus: CommandBus = CommandBus.getInstance()) {
    this.universeEngine = universeEngine;
    this.commandBus = commandBus;

    // Apply default High preset (10,000 particles)
    this.applyProfile('HIGH');
  }

  public getMode(): QualityPreset {
    return this.mode;
  }

  public getCurrentTier(): 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW' {
    return this.currentTier;
  }

  public setMode(preset: QualityPreset): void {
    this.mode = preset;
    if (preset !== 'AUTO') {
      this.applyProfile(preset);
    }
  }

  public updateFPS(fps: number): void {
    if (this.mode !== 'AUTO') return;

    if (fps < this.lowThresholdFps) {
      this.lowFpsCounter++;
      this.highFpsCounter = 0;

      if (this.lowFpsCounter > 45) {
        this.stepDownQuality();
        this.lowFpsCounter = 0;
      }
    } else if (fps >= this.highThresholdFps) {
      this.highFpsCounter++;
      this.lowFpsCounter = 0;

      if (this.highFpsCounter > 90) {
        this.stepUpQuality();
        this.highFpsCounter = 0;
      }
    } else {
      this.lowFpsCounter = 0;
      this.highFpsCounter = 0;
    }
  }

  private stepDownQuality(): void {
    if (this.currentTier === 'ULTRA') {
      this.applyProfile('HIGH', true);
    } else if (this.currentTier === 'HIGH') {
      this.applyProfile('MEDIUM', true);
    } else if (this.currentTier === 'MEDIUM') {
      this.applyProfile('LOW', true);
    }
  }

  private stepUpQuality(): void {
    if (this.currentTier === 'LOW') {
      this.applyProfile('MEDIUM', true);
    } else if (this.currentTier === 'MEDIUM') {
      this.applyProfile('HIGH', true);
    } else if (this.currentTier === 'HIGH') {
      this.applyProfile('ULTRA', true);
    }
  }

  private applyProfile(tier: 'ULTRA' | 'HIGH' | 'MEDIUM' | 'LOW', notify: boolean = false): void {
    this.currentTier = tier;
    const profile = QUALITY_PROFILES[tier];
    this.universeEngine.setActiveParticleCount(profile.particleCount);

    if (notify) {
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `⚡ Adaptive Quality Scaled: ${profile.label} Particles`,
          icon: '⚡'
        },
        'SYSTEM'
      );
    }
  }
}
