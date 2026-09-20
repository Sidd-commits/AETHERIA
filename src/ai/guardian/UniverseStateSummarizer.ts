import { UniverseSnapshot, UniverseConfig } from '../../types/universe';
import {
  UniverseTelemetrySummary,
  CosmicAnomaly,
  GuardianRecommendation,
  GravitationalEvent,
  EnergyHotspot
} from '../../types/aether';

/**
 * Universe State Summarizer
 * Efficiently condenses thousands of simulation particles and celestial bodies into
 * a compact, structured telemetry summary for the AETHER Guardian without sending raw particle arrays to the LLM.
 */
export class UniverseStateSummarizer {
  /**
   * Summarize universe simulation state
   */
  public static summarize(
    snapshot: UniverseSnapshot,
    config: UniverseConfig
  ): UniverseTelemetrySummary {
    const { entities, particles, ecosystemStats, time, tickCount, isPaused, timeScale, activePreset } = snapshot;
    const { count, positions, velocities, energies } = particles;

    // 1. Entity Classification & Planet Summaries
    let starCount = 0;
    let planetCount = 0;
    let blackHoleCount = 0;
    let asteroidCount = 0;
    let nebulaCount = 0;
    let energyFieldCount = 0;
    let totalCelestialEnergy = 0;

    const planetSummary: UniverseTelemetrySummary['planetSummary'] = [];
    const activeBlackHoles: Array<{ id: string; name: string; mass: number; pos: { x: number; y: number; z: number } }> = [];

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      if (e.isDead) continue;

      totalCelestialEnergy += e.energy || 0;

      switch (e.type) {
        case 'STAR':
          starCount++;
          break;
        case 'PLANET':
          planetCount++;
          planetSummary.push({
            id: e.id,
            name: e.name || `Planet ${planetCount}`,
            radius: e.radius,
            mass: e.mass,
            orbitalRadius: e.orbitalRadius,
            orbitalSpeed: e.orbitalSpeed,
            color: typeof e.color === 'string' ? e.color : '#00f5a0'
          });
          break;
        case 'BLACK_HOLE':
          blackHoleCount++;
          activeBlackHoles.push({
            id: e.id,
            name: e.name || 'Black Hole',
            mass: e.mass,
            pos: { ...e.position }
          });
          break;
        case 'ASTEROID':
          asteroidCount++;
          break;
        case 'NEBULA':
          nebulaCount++;
          break;
        case 'ENERGY_FIELD':
          energyFieldCount++;
          break;
      }
    }

    // 2. Sampled Particle Statistics & Spatial Energy Hotspot Analysis
    let totalParticleEnergy = 0;
    let sumSpeedSq = 0;
    const sampleStride = 4; // Sample every 4th particle for fast 60fps performance
    const sampleCount = Math.floor(count / sampleStride);

    // 8 Spatial Octant Energy Bins
    const octantEnergies = new Float32Array(8);
    const octantCounts = new Uint32Array(8);

    for (let i = 0; i < count; i += sampleStride) {
      const i3 = i * 3;
      const vx = velocities[i3];
      const vy = velocities[i3 + 1];
      const vz = velocities[i3 + 2];
      const speedSq = vx * vx + vy * vy + vz * vz;
      sumSpeedSq += speedSq;

      const e = energies[i];
      totalParticleEnergy += e;

      // Octant binning based on sign of (x, y, z)
      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];

      const octantIdx = (px >= 0 ? 1 : 0) | (py >= 0 ? 2 : 0) | (pz >= 0 ? 4 : 0);
      octantEnergies[octantIdx] += e;
      octantCounts[octantIdx]++;
    }

    // Scale up sampled energy
    totalParticleEnergy *= sampleStride;
    const avgParticleEnergy = count > 0 ? totalParticleEnergy / count : 0;
    const meanSpeedSq = sampleCount > 0 ? sumSpeedSq / sampleCount : 0;
    const velocityDispersion = Math.sqrt(meanSpeedSq);

    // Find Highest Energy Region
    let maxOctantIdx = 0;
    let maxOctantEnergy = 0;
    for (let o = 0; o < 8; o++) {
      if (octantEnergies[o] > maxOctantEnergy) {
        maxOctantEnergy = octantEnergies[o];
        maxOctantIdx = o;
      }
    }

    const octantNames = [
      'Sector Alpha (South-West-Inner)',
      'Sector Beta (South-East-Inner)',
      'Sector Gamma (North-West-Inner)',
      'Sector Delta (North-East-Inner)',
      'Sector Epsilon (South-West-Outer)',
      'Sector Zeta (South-East-Outer)',
      'Sector Eta (North-West-Outer)',
      'Sector Theta (North-East-Outer)'
    ];

    const posX = (maxOctantIdx & 1) ? 6.0 : -6.0;
    const posY = (maxOctantIdx & 2) ? 3.0 : -3.0;
    const posZ = (maxOctantIdx & 4) ? 6.0 : -6.0;

    // Check if primary star or black hole is the dominant energy source
    const primaryStar = entities.find((ent) => !ent.isDead && ent.type === 'STAR');
    const highestEnergyRegion: EnergyHotspot = {
      name: primaryStar ? `${primaryStar.name} Radiant Core` : octantNames[maxOctantIdx],
      position: primaryStar ? { ...primaryStar.position } : { x: posX, y: posY, z: posZ },
      energyDensity: primaryStar ? primaryStar.energy : Math.round(maxOctantEnergy * 10) / 10,
      dominantSource: primaryStar ? primaryStar.name : 'Cosmic Radiant Lattice'
    };

    // 3. Dynamic Stability Score Calculation (0 - 100%)
    let stabilityPenalty = 0;

    // A. Singularity Penalties
    stabilityPenalty += blackHoleCount * 18.0;

    // B. Velocity Dispersion Penalties (Ideal speed range: 0.2 - 1.8)
    if (velocityDispersion > 2.5) {
      stabilityPenalty += (velocityDispersion - 2.5) * 12.0;
    }

    // C. Elevated Gravitational Constant Penalty
    if (config.gravityConstant > 1.8) {
      stabilityPenalty += (config.gravityConstant - 1.8) * 15.0;
    } else if (config.gravityConstant < 0.4) {
      stabilityPenalty += 10.0;
    }

    // D. Low Ecosystem Biomass / Starvation Penalty
    if (ecosystemStats && ecosystemStats.population < 80 && ecosystemStats.population > 0) {
      stabilityPenalty += 8.0;
    }

    const stabilityScore = Math.max(10, Math.min(100, Math.round(100 - stabilityPenalty)));
    const stabilityStatus: UniverseTelemetrySummary['stabilityStatus'] =
      stabilityScore >= 75 ? 'STABLE' : stabilityScore >= 45 ? 'MODERATE_FLUCTUATION' : 'CRITICAL_INSTABILITY';

    // 4. Active Cosmic Anomalies Detection
    const anomalies: CosmicAnomaly[] = [];
    const gravitationalEvents: GravitationalEvent[] = [];

    // Anomaly: Active Singularities
    if (blackHoleCount > 0) {
      anomalies.push({
        id: 'anom_singularity',
        title: `${blackHoleCount} Active Singularity${blackHoleCount > 1 ? 'ies' : ''} Detected`,
        description: `Gravitational curvature is warping spacetime trajectories within influence radius (${activeBlackHoles[0]?.name || 'Gargantua'}).`,
        severity: blackHoleCount > 1 ? 'CRITICAL' : 'WARNING',
        sourceEntityId: activeBlackHoles[0]?.id,
        timestamp: Date.now()
      });

      gravitationalEvents.push({
        type: 'SINGULARITY_FORMATION',
        description: `Relativistic event horizon absorbing incoming matter at accretion rate of ${config.blackHolePullForce}x.`,
        severity: 'WARNING',
        origin: activeBlackHoles[0]?.pos
      });
    }

    // Anomaly: Excessive Gravitational Shear
    if (config.gravityConstant >= 2.0) {
      anomalies.push({
        id: 'anom_high_gravity',
        title: 'High Gravitational Constant',
        description: `G is set to ${config.gravityConstant.toFixed(2)} (Standard is 1.00). Extreme gravitational collapse forces are drawing bodies toward center.`,
        severity: 'WARNING',
        timestamp: Date.now()
      });
    }

    // Anomaly: Velocity Dispersion & High Kinetic Temperature
    if (velocityDispersion > 2.8) {
      anomalies.push({
        id: 'anom_high_kinetic',
        title: 'High Velocity Dispersion',
        description: `Cosmic particles exhibit high turbulent dispersion ($\sigma_v = ${velocityDispersion.toFixed(2)}$), indicating orbital chaos.`,
        severity: 'WARNING',
        timestamp: Date.now()
      });
    }

    // Anomaly: Ecological Biomass Collapse
    if (ecosystemStats && ecosystemStats.population < 60 && ecosystemStats.population > 0) {
      anomalies.push({
        id: 'anom_bio_collapse',
        title: 'Ecological Depletion Warning',
        description: `Organism count has dropped to ${ecosystemStats.population}. Starvation mortality rate is outpacing mitotic reproduction.`,
        severity: 'WARNING',
        timestamp: Date.now()
      });
    }

    // 5. Proactive Guardian Recommendations
    const recommendations: GuardianRecommendation[] = [];

    if (blackHoleCount > 0 && stabilityScore < 60) {
      recommendations.push({
        id: 'rec_align_orbits',
        title: 'Align Planetary Orbits',
        text: 'Singularity tidal forces are destabilizing celestial orbits. Align orbits to restore harmonic balance.',
        suggestedActionName: '🔄 Align Orbits',
        suggestedActionCommand: 'ALIGN_ORBITS'
      });
    }

    if (config.gravityConstant > 2.0) {
      recommendations.push({
        id: 'rec_normalize_gravity',
        title: 'Normalize Gravity Constant',
        text: 'High gravity constant is accelerating particle collapse. Set gravity to 1.0 to stabilize orbital trajectories.',
        suggestedActionName: '⚡ Reset Gravity (1.0)',
        suggestedActionCommand: 'SET_GRAVITY'
      });
    }

    if (ecosystemStats && (ecosystemStats.population < 120 || ecosystemStats.energyCount < 400)) {
      recommendations.push({
        id: 'rec_seed_life',
        title: 'Seed Radiant Life Bloom',
        text: 'Ecosystem vitality is sub-optimal. Inject radiant energy particles and seed 150 new living organisms.',
        suggestedActionName: '🌱 Seed Life',
        suggestedActionCommand: 'SEED_LIFE'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_maintain',
        title: 'Cosmic Equilibrium Maintained',
        text: 'Simulation is currently operating within stable physical and biological parameters.',
        suggestedActionName: '✨ Cosmos Stable'
      });
    }

    return {
      epochTime: Math.round(time * 10) / 10,
      tickCount,
      timeScale,
      isPaused,
      activePreset,
      gravityConstant: config.gravityConstant,
      stabilityScore,
      stabilityStatus,
      stabilityFactors: {
        velocityDispersion: Math.round(velocityDispersion * 100) / 100,
        gravitationalStress: Math.round(stabilityPenalty * 10) / 10,
        orbitalDecayRisk: Math.min(1.0, blackHoleCount * 0.4 + (config.gravityConstant - 1.0) * 0.2),
        boundaryPressure: Math.min(1.0, velocityDispersion / 4.0)
      },
      entityCounts: {
        stars: starCount,
        planets: planetCount,
        blackHoles: blackHoleCount,
        asteroids: asteroidCount,
        nebulae: nebulaCount,
        energyFields: energyFieldCount,
        totalCelestial: entities.filter((e) => !e.isDead).length
      },
      planetSummary,
      energyStats: {
        totalCelestialEnergy: Math.round(totalCelestialEnergy * 10) / 10,
        totalParticleEnergy: Math.round(totalParticleEnergy * 10) / 10,
        averageParticleEnergy: Math.round(avgParticleEnergy * 100) / 100,
        highestEnergyRegion
      },
      ecosystem: {
        population: ecosystemStats?.population || 0,
        matterCount: ecosystemStats?.matterCount || 0,
        energyCount: ecosystemStats?.energyCount || 0,
        births: ecosystemStats?.births || 0,
        deaths: ecosystemStats?.deaths || 0,
        averageEnergy: ecosystemStats?.averageEnergy || 0,
        averageAge: ecosystemStats?.averageAge || 0,
        averageHealth: ecosystemStats?.averageHealth || 0,
        growthRate: ecosystemStats?.populationGrowth || 0
      },
      anomalies,
      gravitationalEvents,
      recommendations
    };
  }
}
