import { UniverseEntity } from '../../types/entity';
import { UniverseConfig } from '../../types/universe';

/**
 * Energy System
 * Manages radiant solar energy, planetary thermal absorption,
 * energy field harmonic resonance, and relativistic jet discharge.
 */
export class EnergySystem {
  /**
   * Update energy transfer across stars, planets, and energy fields
   */
  public update(
    entities: UniverseEntity[],
    config: UniverseConfig,
    dt: number,
    elapsedTime: number
  ): void {
    const count = entities.length;
    const transferRate = config.energyTransferRate;

    for (let i = 0; i < count; i++) {
      const e = entities[i];
      if (e.isDead) continue;

      // 1. Stellar Energy Radiation
      if (e.type === 'STAR') {
        // Slow energy depletion over time
        e.energy = Math.max(0, e.energy - config.starLuminosityDecay * dt);

        // Radiate energy to orbiting planets
        for (let j = 0; j < count; j++) {
          if (i === j) continue;
          const planet = entities[j];
          if (planet.isDead || planet.type !== 'PLANET') continue;

          const dx = planet.position.x - e.position.x;
          const dy = planet.position.y - e.position.y;
          const dz = planet.position.z - e.position.z;
          const distSq = Math.max(1.0, dx * dx + dy * dy + dz * dz);

          // Solar flux: F = L / (4 * PI * r^2)
          const solarFlux = (e.energy * (e.luminosity || 1.0)) / (distSq * 4.0);
          planet.energy = Math.min(
            planet.maxEnergy || 100,
            planet.energy + solarFlux * transferRate * dt
          );
        }
      }

      // 2. Energy Field Harmonics & Pulsing
      if (e.type === 'ENERGY_FIELD') {
        e.fieldHarmonics = Math.sin(elapsedTime * 3.0 + e.energy * 0.1) * 0.5 + 0.5;
        // Natural dissipation
        e.energy = Math.max(0, e.energy - 0.2 * dt);
      }

      // 3. Black Hole Accretion Energy Dissipation
      if (e.type === 'BLACK_HOLE') {
        if (e.energy > 50) {
          // Dissipate relativistic accretion heat
          e.energy -= 2.0 * dt;
        }
      }
    }
  }
}
