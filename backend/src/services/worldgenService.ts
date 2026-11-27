import { z } from 'zod';
import { env } from '../config/env.js';

export const UniverseConfigSchema = z.object({
  theme: z.enum(['peaceful', 'chaotic', 'balanced', 'void', 'hyperdense', 'nebular']).default('balanced'),
  colorPalette: z.enum(['blue', 'fire', 'void', 'aurora', 'cyber', 'spectrum']).default('blue'),
  stars: z.number().int().min(1).max(20).default(3),
  planets: z.number().int().min(0).max(30).default(5),
  blackHoles: z.number().int().min(0).max(5).default(0),
  gravity: z.number().min(0.1).max(5.0).default(1.0),
  energyDensity: z.number().min(0.0).max(1.0).default(0.5),
  formationRate: z.number().min(0.0).max(1.0).default(0.5)
});

export type UniverseConfiguration = z.infer<typeof UniverseConfigSchema>;

export class WorldgenService {
  public static async parsePromptToConfig(prompt: string): Promise<UniverseConfiguration> {
    const text = (prompt || '').trim();
    if (!text) {
      return UniverseConfigSchema.parse({});
    }

    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
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
                  'Convert the user description into a structured UniverseConfiguration JSON object. Allowed fields: theme (peaceful, chaotic, balanced, void, hyperdense, nebular), colorPalette (blue, fire, void, aurora, cyber, spectrum), stars (1-20), planets (0-30), blackHoles (0-5), gravity (0.1-5.0), energyDensity (0.0-1.0), formationRate (0.0-1.0). Never output code or markdown.'
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
            const validation = UniverseConfigSchema.safeParse(parsed);
            if (validation.success) {
              return validation.data;
            }
          }
        }
      } catch (err) {
        console.warn('[WorldgenService] OpenAI proxy failed, using deterministic parser:', err);
      }
    }

    return this.deterministicPromptParser(text);
  }

  public static deterministicPromptParser(prompt: string): UniverseConfiguration {
    const lower = prompt.toLowerCase();

    // Theme detection
    let theme: UniverseConfiguration['theme'] = 'balanced';
    if (lower.includes('peaceful') || lower.includes('calm') || lower.includes('gentle') || lower.includes('zen')) {
      theme = 'peaceful';
    } else if (lower.includes('chaotic') || lower.includes('hostile') || lower.includes('violent') || lower.includes('wild')) {
      theme = 'chaotic';
    } else if (lower.includes('void') || lower.includes('empty') || lower.includes('dark') || lower.includes('abyss')) {
      theme = 'void';
    } else if (lower.includes('hyperdense') || lower.includes('dense') || lower.includes('packed') || lower.includes('massive')) {
      theme = 'hyperdense';
    } else if (lower.includes('nebula') || lower.includes('gas') || lower.includes('cloud')) {
      theme = 'nebular';
    }

    // Color palette detection
    let colorPalette: UniverseConfiguration['colorPalette'] = 'blue';
    if (lower.includes('blue') || lower.includes('cyan') || lower.includes('ocean')) {
      colorPalette = 'blue';
    } else if (lower.includes('fire') || lower.includes('red') || lower.includes('orange') || lower.includes('warm')) {
      colorPalette = 'fire';
    } else if (lower.includes('void') || lower.includes('purple') || lower.includes('violet')) {
      colorPalette = 'void';
    } else if (lower.includes('aurora') || lower.includes('green') || lower.includes('emerald')) {
      colorPalette = 'aurora';
    } else if (lower.includes('cyber') || lower.includes('gold') || lower.includes('yellow')) {
      colorPalette = 'cyber';
    } else if (lower.includes('spectrum') || lower.includes('rainbow') || lower.includes('colorful')) {
      colorPalette = 'spectrum';
    }

    // Extract numbers or keywords for stars
    let stars = 3;
    const starRegexMatch = lower.match(/(\d+)\s*(?:suns?|stars?)/);
    if (starRegexMatch) {
      stars = Math.max(1, Math.min(20, parseInt(starRegexMatch[1], 10)));
    } else if (lower.includes('binary') || lower.includes('two suns') || lower.includes('2 suns') || lower.includes('twin')) stars = 2;
    else if (lower.includes('three suns') || lower.includes('3 suns') || lower.includes('triple')) stars = 3;
    else if (lower.includes('one sun') || lower.includes('single star') || lower.includes('sol')) stars = 1;
    else if (lower.includes('five') || lower.includes('5 stars')) stars = 5;

    // Black holes
    let blackHoles = 0;
    if (lower.includes('black hole') || lower.includes('singularity')) {
      blackHoles = 1;
      if (lower.includes('giant') || lower.includes('massive') || lower.includes('supermassive')) {
        blackHoles = 2;
      }
    }

    // Gravity
    let gravity = 1.0;
    if (theme === 'peaceful') gravity = 0.8;
    else if (theme === 'chaotic') gravity = 2.2;
    else if (theme === 'void') gravity = 0.5;
    else if (theme === 'hyperdense') gravity = 3.0;

    if (lower.includes('high gravity')) gravity = Math.max(gravity, 2.0);
    if (lower.includes('low gravity') || lower.includes('zero gravity')) gravity = 0.3;

    // Energy density & formation rate
    const energyDensity = theme === 'chaotic' ? 0.9 : theme === 'peaceful' ? 0.3 : 0.6;
    const formationRate = lower.includes('rapidly') || lower.includes('fast') ? 0.85 : 0.4;

    return UniverseConfigSchema.parse({
      theme,
      colorPalette,
      stars,
      planets: Math.max(2, stars * 2),
      blackHoles,
      gravity,
      energyDensity,
      formationRate
    });
  }
}
