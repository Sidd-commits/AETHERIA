import {
  AICommandAdapter,
  AIParseResult,
  AIStructuredCommand,
  SimulationContext
} from '../../types/ai';

export interface OpenAIAdapterConfig {
  endpoint: string; // e.g. "https://api.openai.com/v1/chat/completions" or "http://localhost:11434/v1/chat/completions"
  apiKey?: string;
  model?: string; // e.g. "gpt-4o-mini", "llama3.2", "gemini-1.5-flash"
}

const SYSTEM_PROMPT = `You are the AETHERIA Procedural Universe AI Voice Controller.
Convert natural language user instructions into STRICT structured JSON commands for the AETHERIA physics & universe simulation engine.
You must return ONLY raw valid JSON conforming to the schema without markdown fences, explanation text, or commentary.

AVAILABLE ACTIONS:
- CREATE_PLANET: {"action": "CREATE_PLANET", "parameters": {"radius": number (0.1-2.0), "mass": number (0.1-20), "color": "#hex", "orbitalRadius": number (2.0-20.0)}}
- CREATE_BLACK_HOLE: {"action": "CREATE_BLACK_HOLE", "parameters": {"mass": number (50-300), "radius": 1.0, "gravitationalInfluenceRadius": 30.0, "accretionStrength": 2.2}}
- CREATE_SUPERNOVA: {"action": "CREATE_SUPERNOVA", "parameters": {"power": number (0.5-3.0)}, "isDestructive": true}
- SET_COLOR_PALETTE: {"action": "SET_COLOR_PALETTE", "parameters": {"paletteIndex": number (0-5)}}
- ADJUST_GRAVITY: {"action": "ADJUST_GRAVITY", "parameters": {"multiplier": number (0.2-5.0), "direction": "increase"|"decrease"|"reset"}}
- SET_GRAVITY: {"action": "SET_GRAVITY", "parameters": {"gravityConstant": number (0.1-8.0)}}
- ALIGN_ORBITS: {"action": "ALIGN_ORBITS", "parameters": {"center": {"x": 0, "y": 0, "z": 0}}}
- DESTROY_ENTITY: {"action": "DESTROY_ENTITY", "parameters": {"targetType": "PLANET"|"BLACK_HOLE"|"ASTEROID"|"ALL_PLANETS"|"ALL"}, "isDestructive": true}
- PAUSE_SIMULATION: {"action": "PAUSE_SIMULATION", "parameters": {}}
- RESUME_SIMULATION: {"action": "RESUME_SIMULATION", "parameters": {}}
- SET_TIME_SCALE: {"action": "SET_TIME_SCALE", "parameters": {"scale": number (0.1-5.0)}}
- SEED_LIFE: {"action": "SEED_LIFE", "parameters": {"count": 150}}
- SPAWN_ENERGY_BURST: {"action": "SPAWN_ENERGY_BURST", "parameters": {"count": 250}}
- LOAD_PRESET: {"action": "LOAD_PRESET", "parameters": {"preset": "SOLAR_SYSTEM"|"BINARY_STARS_NEBULA"|"BLACK_HOLE_ACCRETION"|"CHAOS_GALAXY"|"AETHERIA_LATTICE"}}
- RESET_UNIVERSE: {"action": "RESET_UNIVERSE", "parameters": {}, "isDestructive": true}

Return JSON with format:
{
  "action": "<ACTION_NAME>",
  "parameters": { ... },
  "confidence": 0.95,
  "explanation": "Brief explanation"
}`;

/**
 * Provider-Agnostic OpenAI Compatible Cloud/Local LLM Adapter
 */
export class OpenAICompatibleAdapter implements AICommandAdapter {
  public readonly id: string = 'openai-compatible';
  public readonly name: string = 'Custom LLM Provider (OpenAI / Gemini / Ollama)';
  public readonly isCloudProvider: boolean = true;

  private config: OpenAIAdapterConfig;

  constructor(config: Partial<OpenAIAdapterConfig> = {}) {
    this.config = {
      endpoint: config.endpoint || 'https://api.openai.com/v1/chat/completions',
      apiKey: config.apiKey || '',
      model: config.model || 'gpt-4o-mini'
    };
  }

  public updateConfig(newConfig: Partial<OpenAIAdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async parseCommand(
    transcript: string,
    context: SimulationContext
  ): Promise<AIParseResult> {
    const startTime = performance.now();

    if (
      !this.config.apiKey &&
      !this.config.endpoint.includes('localhost') &&
      !this.config.endpoint.includes('127.0.0.1')
    ) {
      return {
        success: false,
        errorMessage:
          'API Key not configured for Custom LLM provider. Please enter your API key in Voice AI settings.',
        latencyMs: Math.round(performance.now() - startTime)
      };
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `User voice input: "${transcript}"\nSimulation Context: ${JSON.stringify(context)}`
            }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          errorMessage: `LLM API Error (${response.status}): ${errorText}`,
          latencyMs: Math.round(performance.now() - startTime)
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsedCommand: AIStructuredCommand = JSON.parse(content);
      parsedCommand.rawTranscript = transcript;

      return {
        success: true,
        command: parsedCommand,
        rawResponse: content,
        latencyMs: Math.round(performance.now() - startTime)
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: `Network error connecting to LLM endpoint: ${err.message}`,
        latencyMs: Math.round(performance.now() - startTime)
      };
    }
  }
}
