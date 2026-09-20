import { AICommandAdapter, AIParseResult, SimulationContext } from '../../types/ai';

/**
 * AI Adapter Registry
 * Manages provider-agnostic LLM/NLP adapters and allows hot-swapping providers.
 */
export class AIAdapterRegistry {
  private static instance: AIAdapterRegistry;
  private adapters: Map<string, AICommandAdapter> = new Map();
  private activeAdapterId: string = 'heuristic-local';

  private constructor() {}

  public static getInstance(): AIAdapterRegistry {
    if (!AIAdapterRegistry.instance) {
      AIAdapterRegistry.instance = new AIAdapterRegistry();
    }
    return AIAdapterRegistry.instance;
  }

  public register(adapter: AICommandAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public setActiveAdapter(id: string): boolean {
    if (this.adapters.has(id)) {
      this.activeAdapterId = id;
      return true;
    }
    return false;
  }

  public getActiveAdapter(): AICommandAdapter {
    const adapter = this.adapters.get(this.activeAdapterId);
    if (!adapter) {
      // Fallback to first available
      const first = this.adapters.values().next().value;
      if (!first) {
        throw new Error('No AICommandAdapter registered in AIAdapterRegistry.');
      }
      return first;
    }
    return adapter;
  }

  public getAvailableAdapters(): Array<{ id: string; name: string; isCloud: boolean }> {
    return Array.from(this.adapters.values()).map((a) => ({
      id: a.id,
      name: a.name,
      isCloud: a.isCloudProvider
    }));
  }
}

export type { AICommandAdapter, AIParseResult, SimulationContext };
