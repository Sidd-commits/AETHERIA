import { UniverseConfiguration, WorldGenValidationResult } from '../../types/worldGen';
import { WorldGenValidator } from './WorldGenValidator';
import { AIAdapterRegistry } from '../../ai/adapters/AICommandAdapter';

/**
 * Natural Language Universe Configuration Parser
 * Converts human descriptions into validated, structured UniverseConfigurations.
 *
 * Guarantees:
 * 1. Pure structured JSON output only (Zero JavaScript / Zero Executable AST).
 * 2. Deterministic local NLP parsing (100% offline).
 * 3. Provider-agnostic cloud LLM delegation support with strict JSON function schemas.
 */
export class UniverseConfigParser {
  private static instance: UniverseConfigParser;
  private adapterRegistry: AIAdapterRegistry;

  private constructor() {
    this.adapterRegistry = AIAdapterRegistry.getInstance();
  }

  public static getInstance(): UniverseConfigParser {
    if (!UniverseConfigParser.instance) {
      UniverseConfigParser.instance = new UniverseConfigParser();
    }
    return UniverseConfigParser.instance;
  }

  /**
   * Parse a natural language prompt into a validated UniverseConfiguration
   */
  public async parseDescription(prompt: string): Promise<WorldGenValidationResult> {
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) {
      return WorldGenValidator.validate(
        WorldGenValidator.getDefaultConfig('Empty prompt provided.')
      );
    }

    // 1. If a cloud adapter is active (e.g. OpenAI / Gemini), attempt cloud JSON synthesis
    try {
      const activeAdapter = this.adapterRegistry.getActiveAdapter();
      if (activeAdapter?.isCloudProvider) {
        try {
          const cloudConfig = await this.queryCloudParser(cleanPrompt);
          if (cloudConfig) {
            return WorldGenValidator.validate(cloudConfig);
          }
        } catch (err) {
          console.warn(
            'Cloud world generation parser failed, falling back to local NLP heuristics:',
            err
          );
        }
      }
    } catch {
      // Offline fallback
    }

    // 2. High-Precision Built-in Cosmological NLP Heuristic Engine
    const parsedLocal = this.parseWithLocalNLP(cleanPrompt);
    return WorldGenValidator.validate(parsedLocal);
  }

  /**
   * Local High-Performance Cosmological NLP Pattern Extractor
   */
  public parseWithLocalNLP(text: string): UniverseConfiguration {
    const t = text.toLowerCase();

    // 1. Extract Theme
    let theme = 'peaceful';
    if (
      t.includes('chao') ||
      t.includes('turbul') ||
      t.includes('viol') ||
      t.includes('wild') ||
      t.includes('unstable') ||
      t.includes('frenzy')
    ) {
      theme = 'chaotic';
    } else if (
      t.includes('harm') ||
      t.includes('zen') ||
      t.includes('balan') ||
      t.includes('order')
    ) {
      theme = 'harmonic';
    } else if (
      t.includes('neb') ||
      t.includes('gas') ||
      t.includes('cloud') ||
      t.includes('dust')
    ) {
      theme = 'nebular';
    } else if (
      t.includes('void') ||
      t.includes('dark') ||
      t.includes('abyss') ||
      t.includes('deep space')
    ) {
      theme = 'void';
    } else if (
      t.includes('peace') ||
      t.includes('seren') ||
      t.includes('calm') ||
      t.includes('tranquil')
    ) {
      theme = 'peaceful';
    }

    // 2. Extract Color Palette
    let colorPalette = 'blue';
    if (
      t.includes('green') ||
      t.includes('emerald') ||
      t.includes('jade') ||
      t.includes('forest') ||
      t.includes('bio') ||
      t.includes('sanctuary')
    ) {
      colorPalette = 'green';
    } else if (
      t.includes('purple') ||
      t.includes('violet') ||
      t.includes('ultraviolet') ||
      t.includes('amethyst')
    ) {
      colorPalette = 'purple';
    } else if (
      t.includes('pink') ||
      t.includes('magenta') ||
      t.includes('sunset') ||
      t.includes('rose') ||
      t.includes('fuchsia')
    ) {
      colorPalette = 'magenta';
    } else if (
      t.includes('yellow') ||
      t.includes('gold') ||
      t.includes('amber') ||
      t.includes('solar') ||
      t.includes('flare') ||
      t.includes('orange')
    ) {
      colorPalette = 'amber';
    } else if (
      t.includes('rainbow') ||
      t.includes('prismatic') ||
      t.includes('spectrum') ||
      t.includes('multi')
    ) {
      colorPalette = 'spectrum';
    } else if (
      t.includes('blue') ||
      t.includes('cyan') ||
      t.includes('azure') ||
      t.includes('aqua') ||
      t.includes('ocean')
    ) {
      colorPalette = 'blue';
    } else {
      // Default palette aligned with theme
      if (theme === 'void') colorPalette = 'purple';
      else if (theme === 'chaotic') colorPalette = 'solar';
      else colorPalette = 'blue';
    }

    // 3. Extract Star Count ("three suns", "2 stars", "binary stars", "no stars", "rapidly forming stars")
    let stars = 1;
    const starMatches = [
      { pattern: /\b(zero|no|without)\s+(suns?|stars?)/, count: 0 },
      { pattern: /\b(single|one|1|a)\s+(sun|star)/, count: 1 },
      { pattern: /\b(two|2|binary|pair of|dual)\s+(suns?|stars?)/, count: 2 },
      { pattern: /\b(three|3|triple|trinary)\s+(suns?|stars?)/, count: 3 },
      { pattern: /\b(four|4|quad)\s+(suns?|stars?)/, count: 4 },
      { pattern: /\b(five|5)\s+(suns?|stars?)/, count: 5 },
      { pattern: /\b(six|6)\s+(suns?|stars?)/, count: 6 },
      { pattern: /(\d+)\s*(?:suns?|stars?)/, countFn: (m: RegExpMatchArray) => parseInt(m[1], 10) }
    ];

    let starMatched = false;
    for (const match of starMatches) {
      const m = t.match(match.pattern);
      if (m) {
        stars = match.countFn ? match.countFn(m) : match.count!;
        starMatched = true;
        break;
      }
    }

    if (!starMatched) {
      if (t.includes('binary')) stars = 2;
      else if (t.includes('trinary') || t.includes('three suns') || t.includes('3 suns')) stars = 3;
      else if (
        t.includes('rapidly forming stars') ||
        t.includes('stellar nursery') ||
        t.includes('star cluster')
      )
        stars = 4;
      else if (theme === 'void') stars = 0;
      else stars = 1;
    }

    // 4. Extract Black Holes ("giant black hole in the center", "two black holes", "singularities")
    let blackHoles = 0;
    if (
      t.includes('black hole') ||
      t.includes('singularity') ||
      t.includes('event horizon') ||
      t.includes('abyss')
    ) {
      if (
        t.includes('two black holes') ||
        t.includes('2 black holes') ||
        t.includes('dual singularities') ||
        t.includes('pair of black holes')
      ) {
        blackHoles = 2;
      } else if (t.includes('three black holes') || t.includes('3 black holes')) {
        blackHoles = 3;
      } else if (
        t.includes('no black hole') ||
        t.includes('zero black hole') ||
        t.includes('without black hole')
      ) {
        blackHoles = 0;
      } else {
        blackHoles = 1;
      }
    }

    // 5. Extract Gravity ("high gravity", "low gravity", "gravity 1.4", "extreme gravity", "zero g")
    let gravity = 1.0;
    const explicitGravityMatch = t.match(/gravity\s*(?:of|is|at|:|=)?\s*([0-9]+(?:\.[0-9]+)?)/);
    if (explicitGravityMatch) {
      gravity = parseFloat(explicitGravityMatch[1]);
    } else {
      if (
        t.includes('high gravity') ||
        t.includes('strong gravity') ||
        t.includes('heavy gravity') ||
        t.includes('extreme gravity')
      ) {
        gravity = theme === 'chaotic' ? 2.2 : 1.6;
      } else if (
        t.includes('low gravity') ||
        t.includes('gentle gravity') ||
        t.includes('microgravity') ||
        t.includes('weak gravity')
      ) {
        gravity = 0.45;
      } else if (t.includes('zero gravity') || t.includes('no gravity')) {
        gravity = 0.15;
      } else if (theme === 'chaotic') {
        gravity = 1.8;
      } else if (theme === 'peaceful' && blackHoles > 0) {
        gravity = 1.4;
      } else if (theme === 'peaceful') {
        gravity = 0.85;
      } else {
        gravity = 1.0;
      }
    }

    // 6. Extract Energy Density ("high energy", "energy 0.7", "low energy", "dense energy fields", "radiant")
    let energyDensity = 1.0;
    const explicitEnergyMatch = t.match(
      /energy\s*(?:density|level)?\s*(?:of|is|at|:|=)?\s*([0-9]+(?:\.[0-9]+)?)/
    );
    if (explicitEnergyMatch) {
      energyDensity = parseFloat(explicitEnergyMatch[1]);
    } else {
      if (
        t.includes('high energy') ||
        t.includes('dense energy') ||
        t.includes('supercharged') ||
        t.includes('hyper')
      ) {
        energyDensity = 1.8;
      } else if (
        t.includes('low energy') ||
        t.includes('peaceful') ||
        t.includes('dim') ||
        t.includes('faint')
      ) {
        energyDensity = 0.65;
      } else if (theme === 'chaotic') {
        energyDensity = 1.7;
      } else if (theme === 'void') {
        energyDensity = 1.4;
      } else {
        energyDensity = 1.0;
      }
    }

    // 7. Extract Formation Rate ("rapidly forming stars", "formation rate 0.3", "fast accretion", "slow formation")
    let formationRate = 0.5;
    const explicitFormationMatch = t.match(
      /formation\s*(?:rate)?\s*(?:of|is|at|:|=)?\s*([0-9]+(?:\.[0-9]+)?)/
    );
    if (explicitFormationMatch) {
      formationRate = parseFloat(explicitFormationMatch[1]);
    } else {
      if (
        t.includes('rapidly forming') ||
        t.includes('fast forming') ||
        t.includes('rapid stars') ||
        t.includes('active accretion')
      ) {
        formationRate = 1.5;
      } else if (
        t.includes('slowly forming') ||
        t.includes('peaceful') ||
        t.includes('stable') ||
        t.includes('quiescent')
      ) {
        formationRate = 0.3;
      } else if (theme === 'chaotic') {
        formationRate = 1.4;
      } else {
        formationRate = 0.5;
      }
    }

    // 8. Planets count
    let planets = 4;
    const planetMatch = t.match(/(\d+)\s*planets?/);
    if (planetMatch) {
      planets = parseInt(planetMatch[1], 10);
    } else if (t.includes('no planet') || theme === 'void') {
      planets = 0;
    } else if (stars === 3) {
      planets = 5;
    } else if (stars === 2) {
      planets = 4;
    } else if (stars === 1) {
      planets = 4;
    } else {
      planets = 2;
    }

    // 9. Asteroid Belts
    let asteroidBelts = 1;
    if (
      t.includes('asteroid') ||
      t.includes('debris') ||
      t.includes('belt') ||
      t.includes('ring')
    ) {
      asteroidBelts = 2;
    } else if (theme === 'chaotic') {
      asteroidBelts = 2;
    }

    // 10. Seed Organisms
    const seedOrganisms =
      t.includes('organism') ||
      t.includes('life') ||
      t.includes('sanctuary') ||
      t.includes('ecosystem') ||
      theme === 'peaceful' ||
      theme === 'harmonic';

    return {
      theme,
      colorPalette,
      stars,
      planets,
      blackHoles,
      gravity,
      energyDensity,
      formationRate,
      asteroidBelts,
      seedOrganisms,
      prompt: text,
      timestamp: Date.now()
    };
  }

  /**
   * Optional Cloud LLM Invocation with Strict Structured Function Schema
   */
  private async queryCloudParser(prompt: string): Promise<UniverseConfiguration | null> {
    const activeAdapter = this.adapterRegistry.getActiveAdapter();
    const systemPrompt = `You are the Universe Generator AI for AETHERIA.
Convert the user's natural language universe description into a pure structured JSON UniverseConfiguration.
Do NOT output code, explanations, markdown quotes, or executable JavaScript. Only valid JSON matching this schema:
{
  "theme": "peaceful" | "chaotic" | "harmonic" | "nebular" | "void",
  "colorPalette": "blue" | "purple" | "cyan" | "green" | "amber" | "spectrum" | "magenta" | "solar",
  "stars": integer (0 to 12),
  "planets": integer (0 to 20),
  "blackHoles": integer (0 to 5),
  "gravity": float (0.1 to 5.0),
  "energyDensity": float (0.1 to 3.0),
  "formationRate": float (0.0 to 2.0),
  "asteroidBelts": integer (0 to 3),
  "seedOrganisms": boolean
}`;

    const res = await activeAdapter.parseCommand(
      `GENERATE_WORLD: ${prompt}\n\nSchema requirement:\n${systemPrompt}`,
      {
        dominantBodiesCount: 3,
        activePreset: 'SOLAR_SYSTEM',
        isPaused: false,
        timeScale: 1.0,
        gravityConstant: 1.0,
        organismCount: 500,
        entities: []
      }
    );

    if (res.success && res.command?.parameters) {
      return res.command.parameters as unknown as UniverseConfiguration;
    }

    return null;
  }
}
