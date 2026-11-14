import { UniverseConfiguration, WorldGenValidationResult } from '../../types/worldGen';

/**
 * Strict World Generation Configuration Validator & Sanitizer
 *
 * SECURITY GUARANTEE:
 * - Pure data validator only.
 * - Rejects any executable code, scripts, prototypes, or arbitrary ASTs.
 * - Enforces deterministic physics bounds and sane simulation limits.
 */
export class WorldGenValidator {
  /**
   * Validate and sanitize an incoming raw UniverseConfiguration object
   */
  public static validate(rawConfig: unknown): WorldGenValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
      return {
        isValid: false,
        sanitizedConfig: this.getDefaultConfig('Invalid configuration payload received.'),
        errors: ['Configuration must be a non-null JSON object.'],
        warnings: [],
        securityVerified: true
      };
    }

    const raw = rawConfig as Record<string, any>;

    // 1. Security check: Disallow forbidden prototype / constructor properties
    const forbiddenKeys = ['__proto__', 'constructor', 'prototype', 'eval', 'Function'];
    for (const key of Object.keys(raw)) {
      if (forbiddenKeys.includes(key)) {
        errors.push(`Security violation: Forbidden property "${key}" detected.`);
      }
      if (typeof raw[key] === 'function') {
        errors.push(
          `Security violation: Functions or executable code are strictly forbidden in configuration.`
        );
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        sanitizedConfig: this.getDefaultConfig(),
        errors,
        warnings,
        securityVerified: false
      };
    }

    // 2. Validate & Sanitize "theme"
    let theme = 'peaceful';
    if (typeof raw.theme === 'string' && raw.theme.trim().length > 0) {
      theme = this.sanitizeTheme(raw.theme);
    } else {
      warnings.push('Theme missing or invalid; defaulting to "peaceful".');
    }

    // 3. Validate & Sanitize "colorPalette"
    let colorPalette = 'blue';
    if (typeof raw.colorPalette === 'string' && raw.colorPalette.trim().length > 0) {
      colorPalette = this.sanitizeColorPalette(raw.colorPalette);
    } else {
      warnings.push('Color palette missing or invalid; defaulting to "blue".');
    }

    // 4. Validate & Sanitize "stars"
    let stars = 1;
    if (typeof raw.stars === 'number' && !isNaN(raw.stars)) {
      const clampedStars = Math.max(0, Math.min(12, Math.round(raw.stars)));
      if (clampedStars !== raw.stars) {
        warnings.push(`Stars count ${raw.stars} clamped to valid range [0..12]: ${clampedStars}.`);
      }
      stars = clampedStars;
    } else if (raw.stars !== undefined) {
      warnings.push('Invalid stars value; defaulting to 1.');
    }

    // 5. Validate & Sanitize "blackHoles"
    let blackHoles = 0;
    if (typeof raw.blackHoles === 'number' && !isNaN(raw.blackHoles)) {
      const clampedBH = Math.max(0, Math.min(5, Math.round(raw.blackHoles)));
      if (clampedBH !== raw.blackHoles) {
        warnings.push(
          `Black holes count ${raw.blackHoles} clamped to valid range [0..5]: ${clampedBH}.`
        );
      }
      blackHoles = clampedBH;
    } else if (raw.blackHoles !== undefined) {
      warnings.push('Invalid blackHoles value; defaulting to 0.');
    }

    // 6. Validate & Sanitize "planets"
    let planets = 4;
    if (typeof raw.planets === 'number' && !isNaN(raw.planets)) {
      const clampedPlanets = Math.max(0, Math.min(20, Math.round(raw.planets)));
      if (clampedPlanets !== raw.planets) {
        warnings.push(
          `Planets count ${raw.planets} clamped to valid range [0..20]: ${clampedPlanets}.`
        );
      }
      planets = clampedPlanets;
    } else {
      // Inferred automatically based on stars and theme
      planets = stars > 0 ? stars * 3 : 0;
    }

    // 7. Validate & Sanitize "gravity"
    let gravity = 1.0;
    if (typeof raw.gravity === 'number' && !isNaN(raw.gravity)) {
      const clampedG = Math.max(0.1, Math.min(5.0, Number(raw.gravity.toFixed(2))));
      if (clampedG !== raw.gravity) {
        warnings.push(`Gravity constant ${raw.gravity} clamped to range [0.1..5.0]: ${clampedG}.`);
      }
      gravity = clampedG;
    } else if (raw.gravity !== undefined) {
      warnings.push('Invalid gravity value; defaulting to 1.0.');
    }

    // 8. Validate & Sanitize "energyDensity"
    let energyDensity = 1.0;
    if (typeof raw.energyDensity === 'number' && !isNaN(raw.energyDensity)) {
      const clampedE = Math.max(0.1, Math.min(3.0, Number(raw.energyDensity.toFixed(2))));
      if (clampedE !== raw.energyDensity) {
        warnings.push(
          `Energy density ${raw.energyDensity} clamped to range [0.1..3.0]: ${clampedE}.`
        );
      }
      energyDensity = clampedE;
    } else if (raw.energyDensity !== undefined) {
      warnings.push('Invalid energyDensity value; defaulting to 1.0.');
    }

    // 9. Validate & Sanitize "formationRate"
    let formationRate = 0.5;
    if (typeof raw.formationRate === 'number' && !isNaN(raw.formationRate)) {
      const clampedF = Math.max(0.0, Math.min(2.0, Number(raw.formationRate.toFixed(2))));
      if (clampedF !== raw.formationRate) {
        warnings.push(
          `Formation rate ${raw.formationRate} clamped to range [0.0..2.0]: ${clampedF}.`
        );
      }
      formationRate = clampedF;
    } else if (raw.formationRate !== undefined) {
      warnings.push('Invalid formationRate value; defaulting to 0.5.');
    }

    // 10. Optional Asteroid Belts
    let asteroidBelts = 1;
    if (typeof raw.asteroidBelts === 'number' && !isNaN(raw.asteroidBelts)) {
      asteroidBelts = Math.max(0, Math.min(3, Math.round(raw.asteroidBelts)));
    }

    // 11. Seed Organisms
    const seedOrganisms =
      raw.seedOrganisms ?? (theme === 'peaceful' || theme === 'harmonic' || energyDensity > 0.5);

    const sanitizedConfig: UniverseConfiguration = {
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
      prompt: typeof raw.prompt === 'string' ? raw.prompt.slice(0, 300) : undefined,
      timestamp: Date.now()
    };

    return {
      isValid: errors.length === 0,
      sanitizedConfig,
      errors,
      warnings,
      securityVerified: true
    };
  }

  public static sanitizeTheme(themeRaw: string): string {
    const t = themeRaw.toLowerCase().trim();
    if (t.includes('peace') || t.includes('seren') || t.includes('calm') || t.includes('tranquil'))
      return 'peaceful';
    if (t.includes('chao') || t.includes('turbul') || t.includes('viol') || t.includes('wild'))
      return 'chaotic';
    if (t.includes('harm') || t.includes('balan') || t.includes('zen')) return 'harmonic';
    if (t.includes('neb') || t.includes('gas') || t.includes('dust') || t.includes('cloud'))
      return 'nebular';
    if (t.includes('void') || t.includes('dark') || t.includes('abyss') || t.includes('empty'))
      return 'void';
    return t.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'peaceful';
  }

  public static sanitizeColorPalette(paletteRaw: string): string {
    const p = paletteRaw.toLowerCase().trim();
    if (
      p.includes('blue') ||
      p.includes('cyan') ||
      p.includes('azure') ||
      p.includes('aqua') ||
      p.includes('sky')
    )
      return 'blue';
    if (
      p.includes('green') ||
      p.includes('emerald') ||
      p.includes('lime') ||
      p.includes('nature') ||
      p.includes('bio')
    )
      return 'green';
    if (
      p.includes('purple') ||
      p.includes('violet') ||
      p.includes('ultraviolet') ||
      p.includes('indigo')
    )
      return 'purple';
    if (
      p.includes('pink') ||
      p.includes('magenta') ||
      p.includes('rose') ||
      p.includes('sunset') ||
      p.includes('fuchsia')
    )
      return 'magenta';
    if (
      p.includes('yellow') ||
      p.includes('solar') ||
      p.includes('gold') ||
      p.includes('amber') ||
      p.includes('orange')
    )
      return 'amber';
    if (
      p.includes('prismatic') ||
      p.includes('spectrum') ||
      p.includes('rainbow') ||
      p.includes('multi')
    )
      return 'spectrum';
    return 'blue';
  }

  public static getPaletteIndex(colorPalette: string): number {
    switch (colorPalette.toLowerCase()) {
      case 'purple':
      case 'violet':
        return 0; // Void Ultraviolet
      case 'blue':
      case 'cyan':
        return 1; // Cyber Cyan
      case 'magenta':
      case 'pink':
        return 2; // Sunset Magenta
      case 'green':
      case 'emerald':
        return 3; // Hyper Emerald
      case 'amber':
      case 'solar':
      case 'yellow':
        return 4; // Solar Flare
      case 'spectrum':
      case 'prismatic':
      default:
        return 5; // Prismatic Spectrum
    }
  }

  public static getDefaultConfig(prompt?: string): UniverseConfiguration {
    return {
      theme: 'peaceful',
      colorPalette: 'blue',
      stars: 1,
      planets: 4,
      blackHoles: 0,
      gravity: 1.0,
      energyDensity: 1.0,
      formationRate: 0.5,
      asteroidBelts: 1,
      seedOrganisms: true,
      prompt: prompt || 'Standard Harmonic Solar Universe',
      timestamp: Date.now()
    };
  }
}
