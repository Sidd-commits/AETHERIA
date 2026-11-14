import { UniverseTelemetrySummary, AetherQueryResponse } from '../../types/aether';
import { AIAdapterRegistry } from '../adapters/AICommandAdapter';

/**
 * AETHER — Intelligent Guardian of the Simulated Universe
 * Analyzes compressed telemetry and explains cosmological events, instability causes,
 * energy distributions, particle physics, and counterfactual questions in natural language.
 */
export class AetherGuardian {
  private static instance: AetherGuardian;
  private adapterRegistry: AIAdapterRegistry;

  private constructor() {
    this.adapterRegistry = AIAdapterRegistry.getInstance();
  }

  public static getInstance(): AetherGuardian {
    if (!AetherGuardian.instance) {
      AetherGuardian.instance = new AetherGuardian();
    }
    return AetherGuardian.instance;
  }

  /**
   * Ask AETHER a natural language question about the universe simulation state
   */
  public async query(
    question: string,
    telemetry: UniverseTelemetrySummary
  ): Promise<AetherQueryResponse> {
    const q = (question || '').trim().toLowerCase();

    // 1. Check if configured cloud adapter is active; if so, we can query it with compact telemetry
    try {
      const activeAdapter = this.adapterRegistry.getActiveAdapter();
      if (activeAdapter?.isCloudProvider) {
        try {
          const cloudResponse = await this.queryCloudGuardian(question, telemetry);
          if (cloudResponse) return cloudResponse;
        } catch (err) {
          console.warn(
            'Cloud guardian query failed, falling back to built-in AETHER intelligence:',
            err
          );
        }
      }
    } catch {
      // No adapter registered or active; use deterministic intelligence
    }

    // 2. Built-in Deterministic Cosmological Intelligence Engine
    return this.answerWithLocalIntelligence(q, telemetry);
  }

  /**
   * Comprehensive Built-in Cosmological Diagnostic Engine
   */
  private answerWithLocalIntelligence(
    q: string,
    telemetry: UniverseTelemetrySummary
  ): AetherQueryResponse {
    const {
      entityCounts,
      planetSummary,
      energyStats,
      stabilityScore,
      stabilityStatus,
      anomalies,
      ecosystem,
      gravityConstant,
      activePreset,
      epochTime
    } = telemetry;

    // QUESTION 1: "How many planets exist?"
    if (
      q.includes('planet') &&
      (q.includes('how many') ||
        q.includes('count') ||
        q.includes('list') ||
        q.includes('exist') ||
        q.includes('number'))
    ) {
      const count = entityCounts.planets;
      if (count === 0) {
        return {
          question: q,
          answer: `Currently, there are **0 planets** in the simulated cosmos.`,
          reasoning: `No planetary bodies are registered in the current ${activePreset.replace(/_/g, ' ')} preset.`,
          metrics: { planetCount: 0, totalEntities: entityCounts.totalCelestial },
          suggestedAction: {
            label: '🪐 Create a Planet',
            actionCommand: 'CREATE_PLANET',
            payload: { radius: 0.35, mass: 1.8, color: '#00f5a0' }
          }
        };
      }

      const planetListStr = planetSummary
        .map(
          (p, i) =>
            `${i + 1}. **${p.name}** (Orbit: ${p.orbitalRadius ? p.orbitalRadius.toFixed(1) + ' AU' : 'Free'}, Mass: ${p.mass.toFixed(1)} M☉, Radius: ${p.radius.toFixed(2)})`
        )
        .join('\n');

      return {
        question: q,
        answer: `There are currently **${count} active planet${count > 1 ? 's' : ''}** orbiting in the universe.\n\n${planetListStr}`,
        reasoning: `Planetary bodies maintain stable Keplerian orbits around dominant gravitational attractors with circularized velocities.`,
        metrics: {
          planetCount: count,
          planets: planetSummary.map((p) => p.name),
          totalCelestialBodies: entityCounts.totalCelestial
        },
        suggestedAction: {
          label: '🔄 Align Planetary Orbits',
          actionCommand: 'ALIGN_ORBITS'
        }
      };
    }

    // QUESTION 2: "What is causing the instability?"
    if (
      q.includes('instab') ||
      q.includes('unstable') ||
      q.includes('collapse') ||
      q.includes('chaos') ||
      q.includes('stability')
    ) {
      const issues: string[] = [];

      if (entityCounts.blackHoles > 0) {
        issues.push(
          `**${entityCounts.blackHoles} Active Singularity${entityCounts.blackHoles > 1 ? 'ies' : ''}**: Gravitational tidal forces and accretion suction are exerting intense asymmetric shear on nearby orbits.`
        );
      }

      if (gravityConstant > 1.8) {
        issues.push(
          `**Excessive Gravitational Constant ($G = ${gravityConstant.toFixed(2)}$)**: Strong central attraction is overpowering orbital centripetal velocities, pulling bodies inward.`
        );
      } else if (gravityConstant < 0.4) {
        issues.push(
          `**Weak Gravitational Constant ($G = ${gravityConstant.toFixed(2)}$)**: Low gravitational attraction is causing celestial particles to drift apart into deep space.`
        );
      }

      if (telemetry.stabilityFactors.velocityDispersion > 2.5) {
        issues.push(
          `**High Velocity Dispersion ($\\\\sigma_v = ${telemetry.stabilityFactors.velocityDispersion}$)**: Particle kinetic turbulence is high, causing frequent collisions and orbital scattering.`
        );
      }

      if (ecosystem.population < 60 && ecosystem.population > 0) {
        issues.push(
          `**Ecological Biomass Depletion**: Organism mortality is elevated due to radiant energy scarcity.`
        );
      }

      if (issues.length === 0) {
        return {
          question: q,
          answer: `The universe is currently operating in a **Stable Equilibrium** with a Stability Score of **${stabilityScore}%** (${stabilityStatus}).`,
          reasoning: `Gravitational forces and orbital velocities are in centripetal balance, and velocity dispersion is nominal ($\\\\sigma_v = ${telemetry.stabilityFactors.velocityDispersion}$).`,
          metrics: { stabilityScore, stabilityStatus, gravityConstant }
        };
      }

      return {
        question: q,
        answer:
          `The current **Stability Score is ${stabilityScore}% (${stabilityStatus})**. Key drivers of instability include:\n\n` +
          issues.map((iss, i) => `${i + 1}. ${iss}`).join('\n\n'),
        reasoning: `Instability occurs when gravitational force ($F_g = G \\frac{M m}{r^2}$) exceeds centripetal equilibrium ($F_c = \\frac{m v^2}{r}$) or when singularities generate relativistic tidal shear.`,
        metrics: {
          stabilityScore,
          stabilityStatus,
          blackHoles: entityCounts.blackHoles,
          gravityConstant,
          velocityDispersion: telemetry.stabilityFactors.velocityDispersion
        },
        suggestedAction:
          entityCounts.blackHoles > 0
            ? {
                label: '🔄 Re-Align Orbits',
                actionCommand: 'ALIGN_ORBITS'
              }
            : {
                label: '⚡ Reset Gravity (1.0)',
                actionCommand: 'SET_GRAVITY',
                payload: { gravityConstant: 1.0 }
              }
      };
    }

    // QUESTION 3: "Which region has the highest energy?"
    if (
      q.includes('energy') &&
      (q.includes('highest') ||
        q.includes('region') ||
        q.includes('sector') ||
        q.includes('where') ||
        q.includes('most') ||
        q.includes('hotspot'))
    ) {
      const {
        highestEnergyRegion,
        totalCelestialEnergy,
        totalParticleEnergy,
        averageParticleEnergy
      } = energyStats;

      return {
        question: q,
        answer:
          `The highest energy region in the cosmos is **${highestEnergyRegion.name}** with an energy density of **${highestEnergyRegion.energyDensity.toFixed(1)} E**.\n\n` +
          `• **Dominant Source**: ${highestEnergyRegion.dominantSource || 'Solar Plasma Core'}\n` +
          `• **Coordinates**: [x: ${highestEnergyRegion.position.x.toFixed(1)}, y: ${highestEnergyRegion.position.y.toFixed(1)}, z: ${highestEnergyRegion.position.z.toFixed(1)}]\n` +
          `• **Total Particle Radiant Energy**: ${totalParticleEnergy.toLocaleString()} E (Avg: ${averageParticleEnergy.toFixed(2)} E/particle)\n` +
          `• **Celestial Body Energy**: ${totalCelestialEnergy.toLocaleString()} E`,
        reasoning: `Energy is concentrated around stellar fusion cores, supernova shock fronts, and high-density radiant particle clusters.`,
        metrics: {
          highestEnergyRegion: highestEnergyRegion.name,
          energyDensity: highestEnergyRegion.energyDensity,
          totalParticleEnergy,
          totalCelestialEnergy
        },
        suggestedAction: {
          label: '⚡ Release Radiant Energy Bloom',
          actionCommand: 'SPAWN_ENERGY_BURST',
          payload: { count: 250 }
        }
      };
    }

    // QUESTION 4: "Why are particles collapsing?"
    if (
      q.includes('why') &&
      (q.includes('collaps') ||
        q.includes('fall') ||
        q.includes('sink') ||
        q.includes('inward') ||
        q.includes('shrink'))
    ) {
      const bh = entityCounts.blackHoles > 0;
      return {
        question: q,
        answer:
          `Particles are collapsing inward due to **${bh ? 'Singularity Accretion and ' : ''}Gravitational Attraction Coupled with Velocity Damping**.\n\n` +
          `1. **Gravitational Pull**: Massive celestial bodies (e.g. central stars or singularities) exert an attractive force $F = G \\frac{M m}{r^2}$ pulling matter toward the barycenter.\n` +
          `2. **Kinetic Damping**: Collision damping ($k_{damp} = 0.985$) gradually saps radial kinetic energy, causing particles to decay from unstable trajectories into central accretion wells.\n` +
          `3. **Tidal Capture**: ${bh ? 'Black holes possess an event horizon where gravitational acceleration exceeds particle escape velocity, resulting in total absorption.' : 'Without sufficient tangential speed ($v = \\sqrt{G M / r}$), particles cannot sustain perpetual orbit.'}`,
        reasoning: `Orbital mechanics dictate that any loss of tangential momentum in a gravitational potential well results in orbital decay toward the center of mass.`,
        metrics: {
          gravityConstant,
          blackHoles: entityCounts.blackHoles,
          velocityDispersion: telemetry.stabilityFactors.velocityDispersion
        },
        suggestedAction: {
          label: '🔄 Lock Centripetal Orbits',
          actionCommand: 'ALIGN_ORBITS'
        }
      };
    }

    // QUESTION 5: "What will happen if I increase gravity?"
    if (
      q.includes('what will happen') ||
      q.includes('what happens') ||
      (q.includes('increase') && q.includes('gravity')) ||
      (q.includes('if i') && q.includes('gravity'))
    ) {
      const newG = (gravityConstant * 1.5).toFixed(2);
      return {
        question: q,
        answer:
          `If you increase the gravitational constant from **G = ${gravityConstant.toFixed(2)}** to **G = ${newG}**, the following physical transformations will occur:\n\n` +
          `1. **Orbital Contraction**: Planetary orbits will compress inward because the required orbital radius for balance scales inversely with gravity ($r \\propto \\frac{1}{G}$).\n` +
          `2. **Accelerated Particle Collapse**: Cosmic dust and debris will be drawn toward central attractors at $1.5\\times$ higher acceleration.\n` +
          `3. **Orbital Velocity Spikes**: Orbiting planets will need to speed up ($v_{orb} = \\sqrt{G M / r}$) to avoid falling into stars or black holes.\n` +
          `4. **Increased Singularity Accretion**: Black holes will pull in particles from a much wider gravitational radius.`,
        reasoning: `Gravitational force is directly proportional to $G$. Amplifying $G$ shifts the equilibrium of the entire cosmic manifold toward gravitational collapse.`,
        metrics: {
          currentGravity: gravityConstant,
          projectedGravity: parseFloat(newG),
          stabilityImpact: 'Stability will temporarily decrease by ~15-25%'
        },
        suggestedAction: {
          label: '⚡ Increase Gravity (1.5x)',
          actionCommand: 'ADJUST_GRAVITY',
          payload: { multiplier: 1.5, direction: 'increase' }
        }
      };
    }

    // GENERAL COSMOS HEALTH / ECOSYSTEM
    if (
      q.includes('ecosystem') ||
      q.includes('life') ||
      q.includes('organism') ||
      q.includes('population')
    ) {
      return {
        question: q,
        answer:
          `The cosmic ecosystem currently sustains **${ecosystem.population} living organisms** alongside **${ecosystem.energyCount} radiant energy particles** and **${ecosystem.matterCount} inert matter substrates**.\n\n` +
          `• **Average Organism Energy**: ${ecosystem.averageEnergy.toFixed(2)} E\n` +
          `• **Average Health**: ${(ecosystem.averageHealth * 100).toFixed(0)}%\n` +
          `• **Growth Rate**: ${ecosystem.growthRate > 0 ? '+' : ''}${ecosystem.growthRate.toFixed(1)}/s\n` +
          `• **Lifecycle Stats**: ${ecosystem.births} Births / ${ecosystem.deaths} Deaths`,
        reasoning: `Organisms continuously ingest energy to fuel basal metabolism and replicate via mitotic division when energy thresholds are met.`,
        metrics: { ...ecosystem },
        suggestedAction: {
          label: '🌱 Seed 150 Organisms',
          actionCommand: 'SEED_LIFE',
          payload: { count: 150 }
        }
      };
    }

    // FALLBACK GENERAL DIAGNOSTIC
    return {
      question: q,
      answer:
        `I am **AETHER**, the guardian intelligence of this cosmos. The simulation is operating at Epoch **${epochTime}s** under the **${activePreset.replace(/_/g, ' ')}** preset with a Stability Score of **${stabilityScore}%** (${stabilityStatus}).\n\n` +
        `• **Celestial Entities**: ${entityCounts.stars} Stars, ${entityCounts.planets} Planets, ${entityCounts.blackHoles} Black Holes\n` +
        `• **Active Anomalies**: ${anomalies.length > 0 ? anomalies.map((a) => a.title).join(', ') : 'None'}\n` +
        `• **Ecosystem**: ${ecosystem.population} living organisms`,
      reasoning: `Continuous passive monitoring of gravitational metrics, thermodynamic fields, and living particles.`,
      metrics: { epochTime, stabilityScore, stabilityStatus, entityCounts },
      suggestedAction: {
        label: '🪐 Create a Planet',
        actionCommand: 'CREATE_PLANET'
      }
    };
  }

  /**
   * Optional Cloud LLM reasoning with compressed telemetry
   */
  private async queryCloudGuardian(
    question: string,
    telemetry: UniverseTelemetrySummary
  ): Promise<AetherQueryResponse | null> {
    const adapter = this.adapterRegistry.getActiveAdapter();
    if (!adapter.isCloudProvider) return null;

    // Build concise context string without raw arrays
    const summaryStr = JSON.stringify({
      epochTime: telemetry.epochTime,
      stabilityScore: telemetry.stabilityScore,
      stabilityStatus: telemetry.stabilityStatus,
      gravityConstant: telemetry.gravityConstant,
      entityCounts: telemetry.entityCounts,
      planets: telemetry.planetSummary,
      energyHotspot: telemetry.energyStats.highestEnergyRegion,
      ecosystem: telemetry.ecosystem,
      anomalies: telemetry.anomalies.map((a) => a.title)
    });

    const res = await adapter.parseCommand(`Guardian Question: ${question}`, {
      dominantBodiesCount: telemetry.entityCounts.totalCelestial,
      activePreset: telemetry.activePreset,
      timeScale: telemetry.timeScale,
      isPaused: telemetry.isPaused,
      gravityConstant: telemetry.gravityConstant,
      organismCount: telemetry.ecosystem.population,
      entities: telemetry.planetSummary.map((p) => ({
        id: p.id,
        name: p.name,
        type: 'PLANET',
        mass: p.mass,
        position: { x: p.orbitalRadius || 0, y: 0, z: 0 }
      }))
    });

    if (res.success && res.command) {
      return {
        question,
        answer: res.command.explanation || `Action recommended: ${res.command.action}`,
        reasoning: `Cloud LLM evaluated compact telemetry snapshot (${summaryStr.length} bytes).`,
        metrics: { action: res.command.action, parameters: res.command.parameters }
      };
    }

    return null;
  }
}
