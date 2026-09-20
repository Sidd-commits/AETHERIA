import { AIStructuredCommand, CommandValidationResult } from '../../types/ai';
import { UniversePresetId } from '../../types/universe';

const VALID_PRESETS: Set<UniversePresetId> = new Set([
  'SOLAR_SYSTEM',
  'BINARY_STARS_NEBULA',
  'BLACK_HOLE_ACCRETION',
  'CHAOS_GALAXY',
  'AETHERIA_LATTICE'
]);

/**
 * Strict Command Validator
 * Guarantees that ALL commands emitted by LLM/AI layers conform to physical bounds,
 * valid entity types, and safe parameter boundaries before reaching the CommandBus.
 */
export class CommandValidator {
  /**
   * Validate and sanitize an AI structured command
   */
  public static validate(command: AIStructuredCommand): CommandValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!command || typeof command !== 'object') {
      return {
        isValid: false,
        errors: ['Command payload is null or not an object'],
        warnings
      };
    }

    if (!command.action || typeof command.action !== 'string') {
      return {
        isValid: false,
        errors: ['Missing or invalid "action" field'],
        warnings
      };
    }

    const sanitizedParams: Record<string, any> = { ...(command.parameters || {}) };

    switch (command.action) {
      case 'CREATE_PLANET': {
        // Radius: 0.1 - 2.5
        if (sanitizedParams.radius !== undefined) {
          const r = Number(sanitizedParams.radius);
          if (isNaN(r) || r <= 0) {
            errors.push('Planet radius must be a positive number');
          } else {
            sanitizedParams.radius = Math.max(0.1, Math.min(2.5, r));
          }
        } else {
          sanitizedParams.radius = 0.35;
        }

        // Mass: 0.1 - 25.0
        if (sanitizedParams.mass !== undefined) {
          const m = Number(sanitizedParams.mass);
          if (isNaN(m) || m <= 0) {
            errors.push('Planet mass must be a positive number');
          } else {
            sanitizedParams.mass = Math.max(0.1, Math.min(25.0, m));
          }
        } else {
          sanitizedParams.mass = 1.5;
        }

        // Orbital radius: 1.5 - 25.0
        if (sanitizedParams.orbitalRadius !== undefined) {
          const orb = Number(sanitizedParams.orbitalRadius);
          if (!isNaN(orb)) {
            sanitizedParams.orbitalRadius = Math.max(1.5, Math.min(25.0, orb));
          }
        }

        // Color check
        if (sanitizedParams.color && typeof sanitizedParams.color === 'string') {
          sanitizedParams.color = this.sanitizeColor(sanitizedParams.color);
        } else {
          sanitizedParams.color = '#00f5a0';
        }
        break;
      }

      case 'CREATE_BLACK_HOLE': {
        // Mass: 20.0 - 500.0
        if (sanitizedParams.mass !== undefined) {
          const m = Number(sanitizedParams.mass);
          if (isNaN(m) || m <= 0) {
            errors.push('Black hole mass must be a positive number');
          } else {
            sanitizedParams.mass = Math.max(20.0, Math.min(500.0, m));
          }
        } else {
          sanitizedParams.mass = 120.0;
        }

        // Influence radius: 10.0 - 60.0
        if (sanitizedParams.gravitationalInfluenceRadius !== undefined) {
          const inf = Number(sanitizedParams.gravitationalInfluenceRadius);
          sanitizedParams.gravitationalInfluenceRadius = Math.max(
            10.0,
            Math.min(60.0, inf || 30.0)
          );
        }

        // Accretion strength: 0.5 - 5.0
        if (sanitizedParams.accretionStrength !== undefined) {
          const acc = Number(sanitizedParams.accretionStrength);
          sanitizedParams.accretionStrength = Math.max(0.5, Math.min(5.0, acc || 2.0));
        }
        break;
      }

      case 'CREATE_SUPERNOVA': {
        // Supernova is destructive
        command.isDestructive = true;
        if (sanitizedParams.power !== undefined) {
          const p = Number(sanitizedParams.power);
          sanitizedParams.power = Math.max(0.2, Math.min(3.5, p || 1.0));
        } else {
          sanitizedParams.power = 1.2;
        }
        break;
      }

      case 'SET_COLOR_PALETTE': {
        if (sanitizedParams.paletteIndex !== undefined) {
          const idx = Math.floor(Number(sanitizedParams.paletteIndex));
          if (isNaN(idx) || idx < 0 || idx > 5) {
            errors.push('Palette index must be an integer between 0 and 5');
          } else {
            sanitizedParams.paletteIndex = idx;
          }
        }
        break;
      }

      case 'ADJUST_GRAVITY':
      case 'SET_GRAVITY': {
        if (sanitizedParams.gravityConstant !== undefined) {
          const g = Number(sanitizedParams.gravityConstant);
          if (isNaN(g) || g < 0) {
            errors.push('Gravity constant must be a non-negative number');
          } else {
            sanitizedParams.gravityConstant = Math.max(0.05, Math.min(8.0, g));
          }
        } else if (sanitizedParams.multiplier !== undefined) {
          const mult = Number(sanitizedParams.multiplier);
          sanitizedParams.multiplier = Math.max(0.1, Math.min(5.0, mult || 1.5));
        }
        break;
      }

      case 'DESTROY_ENTITY':
      case 'CLEAR_ENTITIES': {
        // Destructive operations
        command.isDestructive = true;
        break;
      }

      case 'RESET_UNIVERSE': {
        command.isDestructive = true;
        break;
      }

      case 'SET_TIME_SCALE': {
        if (sanitizedParams.scale !== undefined) {
          const s = Number(sanitizedParams.scale);
          if (isNaN(s) || s <= 0) {
            errors.push('Time scale must be a positive number');
          } else {
            sanitizedParams.scale = Math.max(0.1, Math.min(5.0, s));
          }
        }
        break;
      }

      case 'LOAD_PRESET': {
        if (sanitizedParams.preset) {
          const presetStr = String(sanitizedParams.preset).toUpperCase().replace(/\s+/g, '_');
          if (!VALID_PRESETS.has(presetStr as UniversePresetId)) {
            errors.push(
              `Invalid universe preset "${sanitizedParams.preset}". Valid options: ${Array.from(VALID_PRESETS).join(', ')}`
            );
          } else {
            sanitizedParams.preset = presetStr as UniversePresetId;
          }
        }
        break;
      }

      case 'SEED_LIFE': {
        if (sanitizedParams.count !== undefined) {
          const c = Math.floor(Number(sanitizedParams.count));
          sanitizedParams.count = Math.max(10, Math.min(500, c || 150));
        } else {
          sanitizedParams.count = 150;
        }
        break;
      }

      case 'SPAWN_ENERGY_BURST': {
        if (sanitizedParams.count !== undefined) {
          const c = Math.floor(Number(sanitizedParams.count));
          sanitizedParams.count = Math.max(20, Math.min(1000, c || 250));
        } else {
          sanitizedParams.count = 250;
        }
        break;
      }

      case 'PAUSE_SIMULATION':
      case 'RESUME_SIMULATION':
      case 'ALIGN_ORBITS':
      case 'CREATE_STAR':
        break;

      default:
        errors.push(`Unknown or unsupported AI action "${command.action}"`);
    }

    const isValid = errors.length === 0;

    const sanitizedCommand: AIStructuredCommand = {
      action: command.action,
      parameters: sanitizedParams,
      confidence: Math.max(0, Math.min(1.0, command.confidence || 0.9)),
      explanation: command.explanation || '',
      isDestructive: command.isDestructive || false,
      rawTranscript: command.rawTranscript || ''
    };

    return {
      isValid,
      sanitizedCommand: isValid ? sanitizedCommand : undefined,
      errors,
      warnings
    };
  }

  /**
   * Normalize and validate hex or named colors
   */
  private static sanitizeColor(color: string): string {
    const trimmed = color.trim().toLowerCase();
    const colorMap: Record<string, string> = {
      blue: '#00f2fe',
      cyan: '#00f2fe',
      green: '#00f5a0',
      emerald: '#00f5a0',
      red: '#ff0844',
      ruby: '#ff0844',
      yellow: '#fee140',
      gold: '#ffd200',
      purple: '#c084fc',
      violet: '#9b51e0',
      white: '#ffffff',
      orange: '#ff9a44',
      pink: '#f857a6'
    };

    if (colorMap[trimmed]) {
      return colorMap[trimmed];
    }

    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
      return trimmed;
    }

    return '#00f2fe';
  }
}
