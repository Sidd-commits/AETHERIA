import { CosmicParticleBuffer, UniverseEntity, ECO_TYPE_MATTER, ECO_TYPE_ENERGY, ECO_TYPE_ORGANISM } from '../../types/entity';
import { EcosystemStats, UniverseConfig } from '../../types/universe';

/**
 * Emergent Particle Ecosystem System
 * Implements deterministic local rules for living ORGANISMS, harvestable ENERGY,
 * and solid MATTER without machine learning.
 */
export class EcosystemSystem {
  // Statistics and Telemetry
  private totalBirths: number = 0;
  private totalDeaths: number = 0;
  private prevPopulation: number = 0;
  private populationGrowthRate: number = 0;
  private growthSampleTimer: number = 0;

  // Cached Ecosystem Stats
  private stats: EcosystemStats = {
    population: 0,
    energyCount: 0,
    matterCount: 0,
    births: 0,
    deaths: 0,
    averageEnergy: 0,
    averageAge: 0,
    averageHealth: 0,
    populationGrowth: 0
  };

  /**
   * Seed initial ecological composition across the particle buffer
   */
  public initializeEcosystem(
    buffer: CosmicParticleBuffer,
    organismCount: number = 600,
    energyCount: number = 2400
  ): void {
    const { count, types, energies, healths, ages, lifetimes, reproductionThresholds, energyConsumptionRates, attractionPreferences, sizes, colors } = buffer;

    const total = Math.min(count, buffer.maxCount);

    for (let i = 0; i < total; i++) {
      const i3 = i * 3;
      if (i < organismCount) {
        // 1. ORGANISM
        types[i] = ECO_TYPE_ORGANISM;
        energies[i] = 1.0 + Math.random() * 0.4;
        healths[i] = 1.0;
        ages[i] = Math.random() * 10.0;
        lifetimes[i] = 75.0 + Math.random() * 45.0; // Max lifespan
        reproductionThresholds[i] = 1.4 + Math.random() * 0.4;
        energyConsumptionRates[i] = 0.032 + Math.random() * 0.018;
        attractionPreferences[i] = 1.0 + Math.random() * 0.5;

        // Visual: Bioluminescent Neon Emerald
        colors[i3] = 0.0;
        colors[i3 + 1] = 0.98;
        colors[i3 + 2] = 0.65;
        sizes[i] = 0.38 + Math.random() * 0.15;
      } else if (i < organismCount + energyCount) {
        // 2. ENERGY
        types[i] = ECO_TYPE_ENERGY;
        energies[i] = 1.0 + Math.random() * 0.8;
        healths[i] = 1.0;
        ages[i] = 0;
        lifetimes[i] = Infinity;
        reproductionThresholds[i] = 0;
        energyConsumptionRates[i] = 0;
        attractionPreferences[i] = 0;

        // Visual: Radiant Solar Gold / Cyan Spark
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.85;
        colors[i3 + 2] = 0.2;
        sizes[i] = 0.24 + Math.random() * 0.08;
      } else {
        // 3. MATTER
        types[i] = ECO_TYPE_MATTER;
        energies[i] = 0.2 + Math.random() * 0.2;
        healths[i] = 0;
        ages[i] = 0;
        lifetimes[i] = Infinity;
        reproductionThresholds[i] = 0;
        energyConsumptionRates[i] = 0;
        attractionPreferences[i] = 0;

        // Visual: Slate Copper Cosmic Dust
        colors[i3] = 0.55;
        colors[i3 + 1] = 0.65;
        colors[i3 + 2] = 0.78;
        sizes[i] = 0.16 + Math.random() * 0.06;
      }
    }
  }

  /**
   * Main deterministic ecosystem tick
   */
  public update(
    buffer: CosmicParticleBuffer,
    celestialEntities: UniverseEntity[],
    _config: UniverseConfig,
    dt: number
  ): void {
    const {
      count,
      types,
      positions,
      velocities,
      energies,
      healths,
      ages,
      lifetimes,
      reproductionThresholds,
      energyConsumptionRates,
      attractionPreferences,
      colors,
      sizes
    } = buffer;

    if (count === 0) return;

    let livingCount = 0;
    let totalOrgEnergy = 0;
    let totalOrgAge = 0;
    let totalOrgHealth = 0;
    let energyParticlesCount = 0;
    let matterParticlesCount = 0;

    // Filter celestial environmental entities
    const stars = celestialEntities.filter((e) => !e.isDead && e.type === 'STAR');
    const blackHoles = celestialEntities.filter((e) => !e.isDead && e.type === 'BLACK_HOLE');
    const nebulae = celestialEntities.filter((e) => !e.isDead && (e.type === 'NEBULA' || e.type === 'ENERGY_FIELD'));

    const sensoryRadius = 4.8;
    const sensoryRadiusSq = sensoryRadius * sensoryRadius;

    // 1. Process All Particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const type = types[i];
      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];

      if (type === ECO_TYPE_ORGANISM) {
        livingCount++;
        ages[i] += dt;
        totalOrgAge += ages[i];
        totalOrgHealth += healths[i];

        // A. Basal Metabolism & Kinetic Energy Loss
        const speedSq = velocities[i3] * velocities[i3] + velocities[i3 + 1] * velocities[i3 + 1] + velocities[i3 + 2] * velocities[i3 + 2];
        const metabolicDrain = (energyConsumptionRates[i] + speedSq * 0.012) * dt;
        energies[i] -= metabolicDrain;

        // Old age decline
        if (ages[i] > lifetimes[i]) {
          healths[i] -= 0.08 * dt;
        }

        // B. Sensory Energy Seeking & Local Foraging
        let nearestEnergyDistSq = sensoryRadiusSq;
        let targetEnergyIdx = -1;

        // Sample nearby neighbors for energy (stride sample for fast O(N) performance)
        const sampleStep = 3;
        for (let j = (i + 1) % sampleStep; j < count; j += sampleStep) {
          if (types[j] === ECO_TYPE_ENERGY) {
            const j3 = j * 3;
            const edx = positions[j3] - px;
            const edy = positions[j3 + 1] - py;
            const edz = positions[j3 + 2] - pz;
            const dSq = edx * edx + edy * edy + edz * edz;

            if (dSq < nearestEnergyDistSq) {
              nearestEnergyDistSq = dSq;
              targetEnergyIdx = j;
            }
          }
        }

        // Steer towards target energy
        if (targetEnergyIdx !== -1) {
          const t3 = targetEnergyIdx * 3;
          const edx = positions[t3] - px;
          const edy = positions[t3 + 1] - py;
          const edz = positions[t3 + 2] - pz;
          const dist = Math.sqrt(nearestEnergyDistSq);

          if (dist > 0.45) {
            // Apply propulsion acceleration
            const seekForce = 2.4 * attractionPreferences[i];
            velocities[i3] += (edx / dist) * seekForce * dt;
            velocities[i3 + 1] += (edy / dist) * seekForce * dt;
            velocities[i3 + 2] += (edz / dist) * seekForce * dt;
          } else {
            // Contact ingestion: Consume energy particle
            energies[i] = Math.min(2.5, energies[i] + 0.65);
            healths[i] = Math.min(1.0, healths[i] + 0.25);

            // Convert consumed energy to depleted matter
            types[targetEnergyIdx] = ECO_TYPE_MATTER;
            energies[targetEnergyIdx] = 0.15;
            colors[t3] = 0.55;
            colors[t3 + 1] = 0.65;
            colors[t3 + 2] = 0.78;
            sizes[targetEnergyIdx] = 0.16;
          }
        } else {
          // Autonomous exploration drift (smooth Brownian undulation)
          velocities[i3] += (Math.random() - 0.5) * 0.4 * dt;
          velocities[i3 + 1] += (Math.random() - 0.5) * 0.3 * dt;
          velocities[i3 + 2] += (Math.random() - 0.5) * 0.4 * dt;
        }

        // C. Environmental Danger Avoidance (Black Holes)
        for (let b = 0; b < blackHoles.length; b++) {
          const bh = blackHoles[b];
          if (bh.isDead) continue;

          const dx = px - bh.position.x;
          const dy = py - bh.position.y;
          const dz = pz - bh.position.z;
          const dist = Math.hypot(dx, dy, dz);
          const influenceR = bh.gravitationalInfluenceRadius || 28.0;

          if (dist < influenceR && dist > 0.1) {
            // Repulsion flee vector
            const fleeForce = (12.0 / Math.max(1.0, dist)) * dt;
            velocities[i3] += (dx / dist) * fleeForce;
            velocities[i3 + 1] += (dy / dist) * fleeForce * 0.5;
            velocities[i3 + 2] += (dz / dist) * fleeForce;

            // Stress / health damage in strong gravitational shear
            if (dist < (bh.accretionRadius || 5.0)) {
              healths[i] -= 0.15 * dt;
            }
          }

          // Event horizon lethal destruction
          if (dist < (bh.eventHorizonRadius || bh.radius)) {
            energies[i] = 0;
            healths[i] = 0;
          }
        }

        // D. Star & Nebula High-Energy Biome Affinity
        const highEnergySources = [...stars, ...nebulae];
        for (let s = 0; s < highEnergySources.length; s++) {
          const source = highEnergySources[s];
          if (source.isDead) continue;

          const dx = source.position.x - px;
          const dy = source.position.y - py;
          const dz = source.position.z - pz;
          const dist = Math.hypot(dx, dy, dz);

          if (dist < 15.0 && dist > 2.0) {
            // Gentle orbital attraction to fertile solar/nebular high-energy zones
            const pull = (1.2 / dist) * dt;
            velocities[i3] += (dx / dist) * pull;
            velocities[i3 + 1] += (dy / dist) * pull;
            velocities[i3 + 2] += (dz / dist) * pull;
          }
        }

        totalOrgEnergy += energies[i];

        // E. Mitotic Reproduction Rule
        if (energies[i] >= reproductionThresholds[i] && ages[i] > 1.5) {
          // Find an available dead / matter slot for offspring
          const childSlot = this.findAvailableSlot(buffer);
          if (childSlot !== -1) {
            this.spawnOffspring(buffer, i, childSlot);
            this.totalBirths++;
          }
        }

        // F. Mortality Rule (Starvation / Lethal Damage / Senescence)
        if (energies[i] <= 0.0 || healths[i] <= 0.0) {
          this.killOrganism(buffer, i);
          this.totalDeaths++;
          matterParticlesCount++;
          continue;
        }

        // G. Dynamic Bioluminescent Visuals
        const energyRatio = Math.min(1.0, energies[i] / reproductionThresholds[i]);
        const isHealthy = healths[i] > 0.4;

        if (isHealthy) {
          // Thriving: Emerald Green to Vibrant Cyan
          colors[i3] = 0.0 * (1 - energyRatio) + 0.2 * energyRatio;
          colors[i3 + 1] = 0.95;
          colors[i3 + 2] = 0.6 * (1 - energyRatio) + 1.0 * energyRatio;
        } else {
          // Starving / Injured: Red-Orange Warning
          colors[i3] = 1.0;
          colors[i3 + 1] = 0.35 * healths[i];
          colors[i3 + 2] = 0.2;
        }

        // Living heartbeat pulsation
        sizes[i] = (0.34 + energies[i] * 0.12) * (0.95 + Math.sin(ages[i] * 5.0) * 0.08);

      } else if (type === ECO_TYPE_ENERGY) {
        energyParticlesCount++;

        // Energy particles drift and slowly pulse
        const shimmer = 0.85 + Math.sin(dt * 10.0 + i) * 0.15;
        colors[i3] = 1.0 * shimmer;
        colors[i3 + 1] = 0.85 * shimmer;
        colors[i3 + 2] = 0.25 * shimmer;

      } else {
        // MATTER (Type 0)
        matterParticlesCount++;

        // Matter converted to Energy in high-radiation solar/nebular zones
        const highEnergySources = [...stars, ...nebulae];
        for (let s = 0; s < highEnergySources.length; s++) {
          const source = highEnergySources[s];
          if (source.isDead) continue;
          const dx = source.position.x - px;
          const dy = source.position.y - py;
          const dz = source.position.z - pz;
          const dist = Math.hypot(dx, dy, dz);

          if (dist < 8.0 && Math.random() < 0.008) {
            // Radiation ionizes matter into harvestable energy
            types[i] = ECO_TYPE_ENERGY;
            energies[i] = 1.0 + Math.random() * 0.5;
            colors[i3] = 1.0;
            colors[i3 + 1] = 0.88;
            colors[i3 + 2] = 0.3;
            sizes[i] = 0.24;
            break;
          }
        }
      }
    }

    // 2. Compute Rolling Population Growth Rate
    this.growthSampleTimer += dt;
    if (this.growthSampleTimer >= 1.0) {
      this.populationGrowthRate = (livingCount - this.prevPopulation) / this.growthSampleTimer;
      this.prevPopulation = livingCount;
      this.growthSampleTimer = 0;
    }

    // 3. Update Statistics Object
    this.stats = {
      population: livingCount,
      energyCount: energyParticlesCount,
      matterCount: matterParticlesCount,
      births: this.totalBirths,
      deaths: this.totalDeaths,
      averageEnergy: livingCount > 0 ? Math.round((totalOrgEnergy / livingCount) * 100) / 100 : 0,
      averageAge: livingCount > 0 ? Math.round((totalOrgAge / livingCount) * 10) / 10 : 0,
      averageHealth: livingCount > 0 ? Math.round((totalOrgHealth / livingCount) * 100) / 100 : 0,
      populationGrowth: Math.round(this.populationGrowthRate * 10) / 10
    };
  }

  /**
   * Find available slot for organism mitosis (recycled matter or dead particle)
   */
  private findAvailableSlot(buffer: CosmicParticleBuffer): number {
    const { count, types } = buffer;
    for (let i = 0; i < count; i++) {
      if (types[i] === ECO_TYPE_MATTER) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Mitotic Reproduction: Split parent energy and activate child slot
   */
  private spawnOffspring(buffer: CosmicParticleBuffer, parentIdx: number, childIdx: number): void {
    const { positions, velocities, energies, healths, ages, lifetimes, reproductionThresholds, energyConsumptionRates, attractionPreferences, types, sizes, colors } = buffer;

    const p3 = parentIdx * 3;
    const c3 = childIdx * 3;

    // Parent splits energy
    const inheritedEnergy = energies[parentIdx] * 0.48;
    energies[parentIdx] = inheritedEnergy;

    // Spawn child with slight spatial offset
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetR = 0.35 + Math.random() * 0.25;

    positions[c3] = positions[p3] + Math.cos(offsetAngle) * offsetR;
    positions[c3 + 1] = positions[p3 + 1] + (Math.random() - 0.5) * 0.2;
    positions[c3 + 2] = positions[p3 + 2] + Math.sin(offsetAngle) * offsetR;

    // Slight separation velocity impulse
    velocities[c3] = velocities[p3] + Math.cos(offsetAngle) * 0.2;
    velocities[c3 + 1] = velocities[p3 + 1];
    velocities[c3 + 2] = velocities[p3 + 2] + Math.sin(offsetAngle) * 0.2;

    types[childIdx] = ECO_TYPE_ORGANISM;
    energies[childIdx] = inheritedEnergy;
    healths[childIdx] = 1.0;
    ages[childIdx] = 0;
    lifetimes[childIdx] = lifetimes[parentIdx] * (0.95 + Math.random() * 0.1);

    // Natural variation mutation
    reproductionThresholds[childIdx] = Math.max(1.1, reproductionThresholds[parentIdx] * (0.95 + Math.random() * 0.1));
    energyConsumptionRates[childIdx] = Math.max(0.02, energyConsumptionRates[parentIdx] * (0.96 + Math.random() * 0.08));
    attractionPreferences[childIdx] = attractionPreferences[parentIdx] * (0.95 + Math.random() * 0.1);

    sizes[childIdx] = sizes[parentIdx] * 0.85;
    colors[c3] = 0.0;
    colors[c3 + 1] = 0.98;
    colors[c3 + 2] = 0.8;
  }

  /**
   * Decompose dead organism back to inert cosmic matter
   */
  private killOrganism(buffer: CosmicParticleBuffer, idx: number): void {
    const { types, energies, healths, colors, sizes } = buffer;
    const i3 = idx * 3;

    types[idx] = ECO_TYPE_MATTER;
    energies[idx] = 0.1;
    healths[idx] = 0;

    // Decomposed slate dust color
    colors[i3] = 0.45;
    colors[i3 + 1] = 0.52;
    colors[i3 + 2] = 0.62;
    sizes[idx] = 0.15;
  }

  /**
   * Spawn a sudden burst of organisms
   */
  public seedOrganisms(buffer: CosmicParticleBuffer, count: number = 50, origin?: { x: number; y: number; z: number }): number {
    const { types, positions, velocities, energies, healths, ages, lifetimes, reproductionThresholds, energyConsumptionRates, attractionPreferences, colors, sizes } = buffer;
    const center = origin || { x: 0, y: 0, z: 0 };
    let spawned = 0;

    for (let i = 0; i < buffer.count && spawned < count; i++) {
      if (types[i] === ECO_TYPE_MATTER) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 3.5;

        positions[i3] = center.x + Math.cos(angle) * r;
        positions[i3 + 1] = center.y + (Math.random() - 0.5) * 1.5;
        positions[i3 + 2] = center.z + Math.sin(angle) * r;

        velocities[i3] = (Math.random() - 0.5) * 0.3;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;

        types[i] = ECO_TYPE_ORGANISM;
        energies[i] = 1.2;
        healths[i] = 1.0;
        ages[i] = 0;
        lifetimes[i] = 80.0 + Math.random() * 40.0;
        reproductionThresholds[i] = 1.5;
        energyConsumptionRates[i] = 0.035;
        attractionPreferences[i] = 1.2;

        colors[i3] = 0.0;
        colors[i3 + 1] = 0.98;
        colors[i3 + 2] = 0.7;
        sizes[i] = 0.4;

        spawned++;
        this.totalBirths++;
      }
    }
    return spawned;
  }

  /**
   * Spawn a burst of harvestable energy particles
   */
  public spawnEnergyBurst(buffer: CosmicParticleBuffer, count: number = 200, origin?: { x: number; y: number; z: number }): number {
    const { types, positions, energies, colors, sizes } = buffer;
    const center = origin || { x: 0, y: 0, z: 0 };
    let spawned = 0;

    for (let i = 0; i < buffer.count && spawned < count; i++) {
      if (types[i] === ECO_TYPE_MATTER) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const r = 1.0 + Math.random() * 5.0;

        positions[i3] = center.x + Math.cos(angle) * r;
        positions[i3 + 1] = center.y + (Math.random() - 0.5) * 2.0;
        positions[i3 + 2] = center.z + Math.sin(angle) * r;

        types[i] = ECO_TYPE_ENERGY;
        energies[i] = 1.5 + Math.random() * 0.5;
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.88;
        colors[i3 + 2] = 0.25;
        sizes[i] = 0.26;

        spawned++;
      }
    }
    return spawned;
  }

  public getStats(): Readonly<EcosystemStats> {
    return this.stats;
  }

  public reset(): void {
    this.totalBirths = 0;
    this.totalDeaths = 0;
    this.prevPopulation = 0;
    this.populationGrowthRate = 0;
    this.growthSampleTimer = 0;
  }
}
