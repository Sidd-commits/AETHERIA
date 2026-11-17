import { z } from 'zod';
import { env } from '../config/env.js';

export const CommandPayloadSchema = z.object({
  type: z.enum([
    'SET_GRAVITY',
    'TRIGGER_SUPERNOVA',
    'RESET_ECOSYSTEM',
    'SPAWN_GALAXY',
    'SET_PALETTE',
    'DESTROY_ENTITY',
    'ALIGN_ORBITS',
    'ENERGY_BURST',
    'TOGGLE_ORBITAL_TRAJECTORIES',
    'TOGGLE_SPACETIME_GRID',
    'SET_INTEGRATOR_MODE',
    'REWIND_TIMELINE',
    'STEP_TIMELINE',
    'RESUME_LIVE',
    'REPLAY_LAST_EVENT'
  ]),
  payload: z.record(z.unknown()).optional(),
  confidence: z.number().min(0).max(1).default(0.95),
  reasoning: z.string().optional()
});

export type ParsedAICommand = z.infer<typeof CommandPayloadSchema>;

export class AIService {
  public static async parseNaturalLanguageCommand(rawText: string): Promise<ParsedAICommand | null> {
    const text = (rawText || '').trim();
    if (!text) return null;

    // Optional OpenAI integration when valid server-side API key exists
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are AETHERIA Voice Simulation Parser. Convert natural language universe commands into structured JSON. Allowed command types: SET_GRAVITY, TRIGGER_SUPERNOVA, RESET_ECOSYSTEM, SPAWN_GALAXY, SET_PALETTE, DESTROY_ENTITY, ALIGN_ORBITS, ENERGY_BURST. Never output executable code or markdown.'
              },
              { role: 'user', content: text }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1
          })
        });

        if (response.ok) {
          const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const validation = CommandPayloadSchema.safeParse(parsed);
            if (validation.success) {
              return validation.data;
            }
          }
        }
      } catch (err) {
        console.warn('[AIService] OpenAI proxy call failed, falling back to local heuristic:', err);
      }
    }

    // High-performance deterministic pattern matcher
    return this.fallbackHeuristicParser(text);
  }

  private static fallbackHeuristicParser(text: string): ParsedAICommand | null {
    const lower = text.toLowerCase();

    // Gravity adjustments
    if (lower.includes('gravity') || lower.includes('pull')) {
      if (lower.includes('high') || lower.includes('heavy') || lower.includes('increase') || lower.includes('strong')) {
        return {
          type: 'SET_GRAVITY',
          payload: { multiplier: 2.0 },
          confidence: 0.95,
          reasoning: 'Interpreted command as strong gravitational amplification.'
        };
      }
      if (lower.includes('low') || lower.includes('light') || lower.includes('decrease') || lower.includes('zero') || lower.includes('micro')) {
        return {
          type: 'SET_GRAVITY',
          payload: { multiplier: 0.25 },
          confidence: 0.95,
          reasoning: 'Interpreted command as gravitational suppression.'
        };
      }
      return {
        type: 'SET_GRAVITY',
        payload: { multiplier: 1.0 },
        confidence: 0.8,
        reasoning: 'Reset gravitational constant to baseline.'
      };
    }

    // ChronoWarp Event Replay (Specific check before general triggers)
    if (lower.includes('replay') || lower.includes('re-play')) {
      return {
        type: 'REPLAY_LAST_EVENT',
        payload: {},
        confidence: 0.95,
        reasoning: 'Rewound simulation to right before last catastrophic cosmic event.'
      };
    }

    // ChronoWarp Step Frame
    if (lower.includes('step back') || lower.includes('step backward') || lower.includes('previous frame')) {
      return {
        type: 'STEP_TIMELINE',
        payload: { delta: -1 },
        confidence: 0.94,
        reasoning: 'Stepped simulation timeline 1 frame into the past.'
      };
    }

    if (lower.includes('step fwd') || lower.includes('step forward') || lower.includes('next frame')) {
      return {
        type: 'STEP_TIMELINE',
        payload: { delta: 1 },
        confidence: 0.94,
        reasoning: 'Stepped simulation timeline 1 frame into the future.'
      };
    }

    // ChronoWarp Reversible Playback
    if (lower.includes('rewind') || lower.includes('reverse time')) {
      return {
        type: 'REWIND_TIMELINE',
        payload: { mode: 'REVERSE' },
        confidence: 0.98,
        reasoning: 'Activated ChronoWarp reversible temporal playback.'
      };
    }

    if (lower.includes('resume time') || lower.includes('back to live') || lower.includes('return to live')) {
      return {
        type: 'RESUME_LIVE',
        payload: {},
        confidence: 0.95,
        reasoning: 'Returned timeline playback to live real-time simulation.'
      };
    }

    // Supernova / explosions
    if (lower.includes('supernova') || lower.includes('explode') || lower.includes('burst') || lower.includes('blast')) {
      return {
        type: 'TRIGGER_SUPERNOVA',
        payload: { power: 1.5 },
        confidence: 0.98,
        reasoning: 'Triggered high-energy celestial supernova shockwave.'
      };
    }

    // Reset ecosystem
    if (lower.includes('reset') || lower.includes('clear') || lower.includes('restore') || lower.includes('restart')) {
      return {
        type: 'RESET_ECOSYSTEM',
        payload: {},
        confidence: 0.99,
        reasoning: 'Ecosystem reset to initial steady-state cosmic equilibrium.'
      };
    }

    // Spawn galaxy / celestial cluster
    if (lower.includes('galaxy') || lower.includes('cluster') || lower.includes('spawn') || lower.includes('spiral')) {
      return {
        type: 'SPAWN_GALAXY',
        payload: { stars: 50, radius: 15 },
        confidence: 0.92,
        reasoning: 'Procedural spiral galaxy cluster generated.'
      };
    }

    // Spacetime grid visualization
    if (lower.includes('spacetime') || lower.includes('curvature') || lower.includes('gravity grid')) {
      return {
        type: 'TOGGLE_SPACETIME_GRID',
        payload: {},
        confidence: 0.95,
        reasoning: 'Toggled general-relativistic spacetime curvature grid.'
      };
    }

    // Orbital trajectory paths
    if (lower.includes('trajectory') || lower.includes('orbit line') || lower.includes('show orbits')) {
      return {
        type: 'TOGGLE_ORBITAL_TRAJECTORIES',
        payload: {},
        confidence: 0.95,
        reasoning: 'Toggled Keplerian orbital trajectory paths.'
      };
    }

    // Physics integrator selection
    if (lower.includes('integrator') || lower.includes('verlet') || lower.includes('precision physics')) {
      return {
        type: 'SET_INTEGRATOR_MODE',
        payload: { mode: 'VERLET' },
        confidence: 0.92,
        reasoning: 'Switched to symplectic Velocity-Verlet energy-conserving physics.'
      };
    }

    // Orbits alignment
    if (lower.includes('orbit') || lower.includes('align') || lower.includes('synchronize')) {
      return {
        type: 'ALIGN_ORBITS',
        payload: { speedMultiplier: 1.2 },
        confidence: 0.9,
        reasoning: 'Synchronized celestial bodies into stable orbital plane.'
      };
    }

    // Destroy entity / black hole vacuum
    if (lower.includes('destroy') || lower.includes('obliterate') || lower.includes('black hole')) {
      return {
        type: 'DESTROY_ENTITY',
        payload: { targetType: 'all_debris' },
        confidence: 0.88,
        reasoning: 'Obliterated cosmic debris in focus.'
      };
    }

    // Palette shift
    if (lower.includes('palette') || lower.includes('color') || lower.includes('theme')) {
      let index = 0;
      if (lower.includes('nebula') || lower.includes('cyan')) index = 0;
      else if (lower.includes('supernova') || lower.includes('fire')) index = 1;
      else if (lower.includes('void') || lower.includes('purple')) index = 2;
      else if (lower.includes('aurora') || lower.includes('green')) index = 3;
      else if (lower.includes('cyber') || lower.includes('gold')) index = 4;
      else if (lower.includes('spectrum')) index = 5;

      return {
        type: 'SET_PALETTE',
        payload: { index },
        confidence: 0.9,
        reasoning: `Switched chromatic spectrum to palette index ${index}.`
      };
    }

    return null;
  }
}
