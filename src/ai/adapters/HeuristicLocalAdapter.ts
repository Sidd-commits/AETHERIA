import {
  AICommandAdapter,
  AIParseResult,
  AIStructuredCommand,
  SimulationContext
} from '../../types/ai';

/**
 * Heuristic Local NLP AI Command Adapter
 * High-performance, zero-latency, deterministic natural language parsing engine.
 * Works 100% offline in browser without API keys or external network requests.
 */
export class HeuristicLocalAdapter implements AICommandAdapter {
  public readonly id: string = 'heuristic-local';
  public readonly name: string = 'Built-in Offline Engine (Zero Latency)';
  public readonly isCloudProvider: boolean = false;

  public async parseCommand(
    transcript: string,
    context: SimulationContext
  ): Promise<AIParseResult> {
    const startTime = performance.now();
    const text = (transcript || '').trim().toLowerCase();

    if (!text) {
      return {
        success: false,
        errorMessage: 'Empty speech transcript received.',
        latencyMs: performance.now() - startTime
      };
    }

    try {
      const command = this.extractCommand(text, context);
      if (command) {
        command.rawTranscript = transcript;
        return {
          success: true,
          command,
          rawResponse: JSON.stringify(command, null, 2),
          latencyMs: Math.round(performance.now() - startTime)
        };
      }

      return {
        success: false,
        errorMessage: `Could not determine a recognized simulation action for "${transcript}". Try phrases like "Create a planet", "Make the universe blue", "Increase gravity", or "Create a supernova".`,
        latencyMs: Math.round(performance.now() - startTime)
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err.message || 'Error parsing command',
        latencyMs: Math.round(performance.now() - startTime)
      };
    }
  }

  private extractCommand(text: string, _context: SimulationContext): AIStructuredCommand | null {
    // 1. BLACK HOLE CREATION ("Create a black hole", "Spawn black hole", "Add a singularity")
    if (
      (text.includes('black hole') || text.includes('singularity')) &&
      (text.includes('create') ||
        text.includes('spawn') ||
        text.includes('add') ||
        text.includes('make') ||
        text.includes('summon'))
    ) {
      const isMassive =
        text.includes('massive') ||
        text.includes('supermassive') ||
        text.includes('huge') ||
        text.includes('giant');
      return {
        action: 'CREATE_BLACK_HOLE',
        parameters: {
          mass: isMassive ? 220.0 : 120.0,
          radius: isMassive ? 1.4 : 1.0,
          gravitationalInfluenceRadius: isMassive ? 45.0 : 30.0,
          accretionStrength: 2.2,
          position: {
            x: (Math.random() - 0.5) * 4.0,
            y: (Math.random() - 0.5) * 1.5,
            z: (Math.random() - 0.5) * 4.0
          }
        },
        confidence: 0.96,
        explanation: `Spawning ${isMassive ? 'supermassive' : 'standard'} relativistic Black Hole with active accretion disk and gravitational lensing.`
      };
    }

    // 2. SUPERNOVA ("Create a supernova", "Trigger supernova", "Explode star", "Stellar burst")
    if (
      text.includes('supernova') ||
      (text.includes('explode') &&
        (text.includes('star') || text.includes('sun') || text.includes('universe'))) ||
      text.includes('detonate')
    ) {
      return {
        action: 'CREATE_SUPERNOVA',
        parameters: {
          power:
            text.includes('huge') || text.includes('giant') || text.includes('mega') ? 2.0 : 1.2
        },
        confidence: 0.98,
        isDestructive: true,
        explanation:
          'Triggering high-energy stellar Supernova detonation and particle ionization shockwave.'
      };
    }

    // 3. ORBIT REALIGNMENT ("Make all planets orbit the center", "Align orbits", "Synchronize planetary orbits")
    if (
      (text.includes('orbit') || text.includes('realign') || text.includes('align')) &&
      (text.includes('all') ||
        text.includes('center') ||
        text.includes('synchronize') ||
        text.includes('system'))
    ) {
      return {
        action: 'ALIGN_ORBITS',
        parameters: {
          center: { x: 0, y: 0, z: 0 },
          speedMultiplier: 1.0
        },
        confidence: 0.95,
        explanation:
          'Re-calculating Keplerian orbital velocities and locking all celestial bodies into stable concentric orbits.'
      };
    }

    // 4. PLANET CREATION ("Create a planet", "Spawn a green planet", "Add a terrestrial world")
    if (
      (text.includes('planet') || text.includes('world')) &&
      (text.includes('create') ||
        text.includes('spawn') ||
        text.includes('add') ||
        text.includes('make')) &&
      !text.includes('orbit the center')
    ) {
      const color = this.extractColor(text) || '#00f5a0';
      const isGiant =
        text.includes('giant') ||
        text.includes('huge') ||
        text.includes('large') ||
        text.includes('gas');
      const isSmall = text.includes('small') || text.includes('tiny') || text.includes('dwarf');

      const radius = isGiant ? 0.6 : isSmall ? 0.2 : 0.35;
      const mass = isGiant ? 5.0 : isSmall ? 0.6 : 1.8;

      // Extract orbit if mentioned (e.g. "orbit 5", "radius 8")
      const orbitMatch = text.match(/(?:orbit|radius|distance)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)/);
      const orbitalRadius = orbitMatch ? parseFloat(orbitMatch[1]) : 3.5 + Math.random() * 6.5;

      return {
        action: 'CREATE_PLANET',
        parameters: {
          name: `Planet-${Math.floor(Math.random() * 899 + 100)}`,
          radius,
          mass,
          color,
          orbitalRadius
        },
        confidence: 0.95,
        explanation: `Synthesizing celestial planet (radius: ${radius}, mass: ${mass}, color: ${color}, orbit: ${orbitalRadius.toFixed(1)} AU).`
      };
    }

    // 4. COLOR PALETTE / THEMES ("Make the universe blue", "Set theme to cyan", "Change colors to emerald")
    if (
      text.includes('blue') ||
      text.includes('cyan') ||
      text.includes('green') ||
      text.includes('emerald') ||
      text.includes('red') ||
      text.includes('ruby') ||
      text.includes('gold') ||
      text.includes('yellow') ||
      text.includes('purple') ||
      text.includes('violet') ||
      text.includes('palette') ||
      text.includes('theme') ||
      text.includes('color')
    ) {
      const paletteIndex = this.extractPaletteIndex(text);
      if (paletteIndex !== -1) {
        return {
          action: 'SET_COLOR_PALETTE',
          parameters: {
            paletteIndex
          },
          confidence: 0.92,
          explanation: `Switching universe visual harmonic palette to index ${paletteIndex}.`
        };
      }
    }

    // 5. GRAVITY ADJUSTMENT ("Increase gravity", "Decrease gravity", "Make gravity stronger", "Set gravity to 2")
    if (text.includes('gravity') || text.includes('gravitational')) {
      const isIncrease =
        text.includes('increase') ||
        text.includes('higher') ||
        text.includes('stronger') ||
        text.includes('more') ||
        text.includes('double') ||
        text.includes('heavy');
      const isDecrease =
        text.includes('decrease') ||
        text.includes('lower') ||
        text.includes('weaker') ||
        text.includes('less') ||
        text.includes('half') ||
        text.includes('light');
      const isReset = text.includes('reset') || text.includes('default') || text.includes('normal');

      // Check for numeric constant (e.g. "gravity to 2.5")
      const numMatch = text.match(/(?:to|is|=)\s*(\d+(?:\.\d+)?)/);
      if (numMatch) {
        const val = parseFloat(numMatch[1]);
        return {
          action: 'SET_GRAVITY',
          parameters: {
            gravityConstant: val
          },
          confidence: 0.94,
          explanation: `Setting universe gravitational constant to ${val}.`
        };
      }

      const multiplier = isIncrease ? 1.5 : isDecrease ? 0.65 : 1.0;
      return {
        action: 'ADJUST_GRAVITY',
        parameters: {
          multiplier,
          direction: isIncrease ? 'increase' : isDecrease ? 'decrease' : isReset ? 'reset' : 'reset'
        },
        confidence: 0.94,
        explanation: `${isIncrease ? 'Amplifying' : isDecrease ? 'Attenuating' : 'Resetting'} gravitational constant by factor of ${multiplier}x.`
      };
    }

    // 6. ORBIT REALIGNMENT ("Make all planets orbit the center", "Align orbits", "Synchronize planetary orbits")
    if (
      (text.includes('orbit') || text.includes('realign') || text.includes('align')) &&
      (text.includes('all') ||
        text.includes('center') ||
        text.includes('planets') ||
        text.includes('system') ||
        text.includes('synchronize'))
    ) {
      return {
        action: 'ALIGN_ORBITS',
        parameters: {
          center: { x: 0, y: 0, z: 0 },
          speedMultiplier: 1.0
        },
        confidence: 0.95,
        explanation:
          'Re-calculating Keplerian orbital velocities and locking all celestial bodies into stable concentric orbits.'
      };
    }

    // 7. ENTITY DESTRUCTION ("Destroy that planet", "Destroy all planets", "Clear black holes", "Delete asteroid")
    if (
      text.includes('destroy') ||
      text.includes('kill') ||
      text.includes('delete') ||
      text.includes('remove') ||
      text.includes('clear')
    ) {
      const isAllPlanets = text.includes('all planets') || text.includes('every planet');
      const isBlackHoles = text.includes('black hole') || text.includes('singularit');
      const isAsteroids = text.includes('asteroid');
      const isAll =
        text.includes('everything') || text.includes('all bodies') || text.includes('all entities');

      return {
        action: 'DESTROY_ENTITY',
        parameters: {
          targetType: isAllPlanets
            ? 'ALL_PLANETS'
            : isBlackHoles
              ? 'ALL_BLACK_HOLES'
              : isAsteroids
                ? 'ASTEROID'
                : isAll
                  ? 'ALL'
                  : 'PLANET',
          all: isAll || isAllPlanets || isBlackHoles
        },
        confidence: 0.92,
        isDestructive: true,
        explanation: `Targeting celestial entity for gravitational dissolution (${isAllPlanets ? 'All Planets' : isBlackHoles ? 'All Black Holes' : 'Target Body'}).`
      };
    }

    // 8. PAUSE / RESUME SIMULATION ("Pause the simulation", "Resume simulation", "Unpause", "Stop simulation")
    if (text.includes('pause') || text.includes('freeze') || text.includes('halt')) {
      return {
        action: 'PAUSE_SIMULATION',
        parameters: {},
        confidence: 0.98,
        explanation: 'Freezing universe physical time step.'
      };
    }

    if (
      text.includes('resume') ||
      text.includes('play') ||
      text.includes('unpause') ||
      text.includes('continue')
    ) {
      return {
        action: 'RESUME_SIMULATION',
        parameters: {},
        confidence: 0.98,
        explanation: 'Resuming procedural universe simulation.'
      };
    }

    // 9. TIME SPEED / SCALE ("Speed up", "Slow down", "Set speed to 2x", "Half speed", "Time scale 5")
    if (
      text.includes('speed') ||
      text.includes('time') ||
      text.includes('fast') ||
      text.includes('slow')
    ) {
      let scale = 1.0;
      if (text.includes('0.25') || text.includes('quarter')) scale = 0.25;
      else if (text.includes('0.5') || text.includes('half') || text.includes('slow motion'))
        scale = 0.5;
      else if (text.includes('2x') || text.includes('double') || text.includes('fast forward'))
        scale = 2.0;
      else if (text.includes('5x') || text.includes('max') || text.includes('maximum')) scale = 5.0;
      else if (text.includes('normal') || text.includes('1x')) scale = 1.0;
      else {
        const match = text.match(/(\d+(?:\.\d+)?)\s*x/);
        if (match) scale = parseFloat(match[1]);
      }

      return {
        action: 'SET_TIME_SCALE',
        parameters: { scale },
        confidence: 0.95,
        explanation: `Adjusting cosmic time propagation velocity to ${scale}x.`
      };
    }

    // 10. ECOSYSTEM CONTROLS ("Seed life", "Spawn organisms", "Energy bloom", "Energy burst")
    if (
      text.includes('seed life') ||
      text.includes('spawn organism') ||
      text.includes('add organism') ||
      text.includes('create life') ||
      text.includes('make life')
    ) {
      return {
        action: 'SEED_LIFE',
        parameters: { count: 150 },
        confidence: 0.96,
        explanation: 'Seeding 150 autonomous living organisms with metabolic gradient seeking.'
      };
    }

    if (
      text.includes('energy') &&
      (text.includes('bloom') ||
        text.includes('burst') ||
        text.includes('spawn') ||
        text.includes('create') ||
        text.includes('add'))
    ) {
      return {
        action: 'SPAWN_ENERGY_BURST',
        parameters: { count: 250 },
        confidence: 0.96,
        explanation: 'Injecting high-density radiant energy field into cosmic particle lattice.'
      };
    }

    // 11. PRESET SELECTION ("Load solar system", "Binary stars preset", "Load galaxy", "Chaos galaxy", "Lattice")
    if (
      text.includes('preset') ||
      text.includes('solar system') ||
      text.includes('binary') ||
      text.includes('galaxy') ||
      text.includes('lattice')
    ) {
      let preset = 'SOLAR_SYSTEM';
      if (text.includes('binary') || text.includes('nebula')) preset = 'BINARY_STARS_NEBULA';
      else if (text.includes('black hole') || text.includes('accretion'))
        preset = 'BLACK_HOLE_ACCRETION';
      else if (text.includes('chaos') || text.includes('galaxy')) preset = 'CHAOS_GALAXY';
      else if (text.includes('lattice') || text.includes('classic') || text.includes('sphere'))
        preset = 'AETHERIA_LATTICE';

      return {
        action: 'LOAD_PRESET',
        parameters: { preset },
        confidence: 0.95,
        explanation: `Synthesizing procedurally configured cosmic system: ${preset.replace(/_/g, ' ')}.`
      };
    }

    // 12. RESET UNIVERSE ("Reset the universe", "Restart simulation", "Reset all")
    if (text.includes('reset') || text.includes('restart') || text.includes('reboot')) {
      return {
        action: 'RESET_UNIVERSE',
        parameters: {},
        confidence: 0.96,
        isDestructive: true,
        explanation: 'Restoring universe simulation to baseline initial condition.'
      };
    }

    return null;
  }

  private extractColor(text: string): string | null {
    if (text.includes('blue') || text.includes('cyan') || text.includes('azure')) return '#00f2fe';
    if (text.includes('green') || text.includes('emerald') || text.includes('lime'))
      return '#00f5a0';
    if (text.includes('red') || text.includes('ruby') || text.includes('crimson')) return '#ff0844';
    if (text.includes('gold') || text.includes('yellow') || text.includes('amber'))
      return '#fee140';
    if (text.includes('purple') || text.includes('violet') || text.includes('magenta'))
      return '#c084fc';
    if (text.includes('orange')) return '#f59e0b';
    if (text.includes('white')) return '#ffffff';
    return null;
  }

  private extractPaletteIndex(text: string): number {
    if (text.includes('ultraviolet') || text.includes('deep purple') || text.includes('theme 0'))
      return 0;
    if (
      text.includes('cyan') ||
      text.includes('electric') ||
      text.includes('blue') ||
      text.includes('theme 1')
    )
      return 1;
    if (
      text.includes('emerald') ||
      text.includes('aurora') ||
      text.includes('green') ||
      text.includes('theme 2')
    )
      return 2;
    if (
      text.includes('supernova') ||
      text.includes('crimson') ||
      text.includes('red') ||
      text.includes('theme 3')
    )
      return 3;
    if (
      text.includes('solar') ||
      text.includes('gold') ||
      text.includes('amber') ||
      text.includes('yellow') ||
      text.includes('theme 4')
    )
      return 4;
    if (text.includes('spectrum') || text.includes('rainbow') || text.includes('theme 5')) return 5;
    return -1;
  }
}
