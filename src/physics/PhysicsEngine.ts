import { PhysicsConfig } from '../types/physics';
import { ParticleBuffer } from '../types/particle';
import { DEFAULT_PHYSICS_CONFIG, ANIMATION_CONFIG } from '../config/constants';

/**
 * Pure numerical physics simulation engine
 * Performs high-performance buffer mutations without allocating objects in the loop
 */
export class PhysicsEngine {
  private config: PhysicsConfig;

  constructor(config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG) {
    this.config = { ...config };
  }

  public setConfig(newConfig: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): Readonly<PhysicsConfig> {
    return this.config;
  }

  /**
   * Run a single physics update step across all particles
   */
  public step(
    buffer: ParticleBuffer,
    elapsedTime: number,
    isCharging: boolean,
    chargeAmount: number
  ): void {
    const { count, basePositions, currentPositions, velocities } = buffer;
    const { springStrength, damping, idleWaveSpeed, idleWaveAmplitude } = this.config;
    const chargeVibe = isCharging ? chargeAmount * ANIMATION_CONFIG.chargeVibrationMagnitude : 0.0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Base resting coordinate with subtle wave undulation
      const wave = Math.sin(elapsedTime * idleWaveSpeed + i * 0.15) * idleWaveAmplitude;
      const targetX = basePositions[i3] * (1 + wave);
      const targetY = basePositions[i3 + 1] * (1 + wave);
      const targetZ = basePositions[i3 + 2] * (1 + wave);

      // Apply velocity from previous forces / explosions
      currentPositions[i3] += velocities[i3];
      currentPositions[i3 + 1] += velocities[i3 + 1];
      currentPositions[i3 + 2] += velocities[i3 + 2];

      // Gravitational Spring return force pulling particles back to sphere
      const dx = targetX - currentPositions[i3];
      const dy = targetY - currentPositions[i3 + 1];
      const dz = targetZ - currentPositions[i3 + 2];

      velocities[i3] += dx * springStrength;
      velocities[i3 + 1] += dy * springStrength;
      velocities[i3 + 2] += dz * springStrength;

      // Velocity Damping
      velocities[i3] *= damping;
      velocities[i3 + 1] *= damping;
      velocities[i3 + 2] *= damping;

      // Add charging trembling jitter if charging
      if (chargeVibe > 0) {
        currentPositions[i3] += (Math.random() - 0.5) * chargeVibe;
        currentPositions[i3 + 1] += (Math.random() - 0.5) * chargeVibe;
        currentPositions[i3 + 2] += (Math.random() - 0.5) * chargeVibe;
      }
    }
  }

  /**
   * Supernova explosion impulse
   */
  public triggerExplosion(buffer: ParticleBuffer, power: number = 1.0): void {
    const { count, currentPositions, velocities } = buffer;
    const magnitude = this.config.explosionForce * (0.8 + power * 1.6);
    const randomJitter = 0.45;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const px = currentPositions[i3];
      const py = currentPositions[i3 + 1];
      const pz = currentPositions[i3 + 2];
      const dist = Math.sqrt(px * px + py * py + pz * pz) || 1.0;

      const dirX = px / dist;
      const dirY = py / dist;
      const dirZ = pz / dist;

      const speed = magnitude * (0.6 + Math.random() * 0.9);

      velocities[i3] = (dirX + (Math.random() - 0.5) * randomJitter) * speed;
      velocities[i3 + 1] = (dirY + (Math.random() - 0.5) * randomJitter) * speed;
      velocities[i3 + 2] = (dirZ + (Math.random() - 0.5) * randomJitter) * speed;
    }
  }
}
