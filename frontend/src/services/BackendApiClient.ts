import { ENV } from '../config/env';
import { UniverseConfiguration } from '../types/worldGen';
import { WorldGenValidator } from '../universe/generator/WorldGenValidator';

export interface BackendPreset {
  id: string;
  name: string;
  description: string;
  config: UniverseConfiguration;
}

export interface BackendHealthStatus {
  online: boolean;
  uptimeSeconds?: number;
  service?: string;
}

/**
 * Full-Stack Backend API Client
 * Connects the AETHERIA SPA to the Express backend microservice when available,
 * with tight timeouts and zero-blocking offline fallback.
 */
export class BackendApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = ENV.VITE_API_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async checkHealth(): Promise<BackendHealthStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      if (!res.ok) return { online: false };
      const data = (await res.json()) as {
        status?: string;
        uptimeSeconds?: number;
        service?: string;
      };
      return {
        online: data.status === 'healthy',
        uptimeSeconds: data.uptimeSeconds,
        service: data.service
      };
    } catch {
      return { online: false };
    }
  }

  public async fetchPresets(): Promise<BackendPreset[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/presets`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500)
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        success?: boolean;
        presets?: Array<{
          id: string;
          name: string;
          description: string;
          config: Record<string, unknown>;
        }>;
      };
      if (!data.success || !Array.isArray(data.presets)) return [];

      return data.presets.map((preset) => {
        const validated = WorldGenValidator.validate({
          ...preset.config,
          prompt: `${preset.name}: ${preset.description}`
        });
        return {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          config: validated.sanitizedConfig
        };
      });
    } catch {
      return [];
    }
  }

  public async generateWorldConfig(prompt: string): Promise<UniverseConfiguration | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/worldgen/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        success?: boolean;
        config?: Record<string, unknown>;
      };
      if (!data.success || !data.config) return null;
      const validated = WorldGenValidator.validate({ ...data.config, prompt });
      return validated.isValid ? validated.sanitizedConfig : null;
    } catch {
      return null;
    }
  }
}
