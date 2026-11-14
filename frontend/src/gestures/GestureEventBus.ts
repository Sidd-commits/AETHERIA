import { SemanticGestureType, GestureLifecycle, GestureEvent } from '../types/gesture';

type GestureEventListener = (event: GestureEvent) => void;

/**
 * Dedicated Typed Event Bus for Gesture Lifecycles and Semantic Gestures
 */
export class GestureEventBus {
  private static instance: GestureEventBus;

  private lifecycleListeners: Map<string, Set<GestureEventListener>> = new Map();
  private wildcardListeners: Set<GestureEventListener> = new Set();

  private constructor() {}

  public static getInstance(): GestureEventBus {
    if (!GestureEventBus.instance) {
      GestureEventBus.instance = new GestureEventBus();
    }
    return GestureEventBus.instance;
  }

  private getKey(type: SemanticGestureType | '*', lifecycle: GestureLifecycle | '*'): string {
    return `${type}:${lifecycle}`;
  }

  /**
   * Subscribe to gesture START lifecycle
   */
  public onStart(type: SemanticGestureType | '*', listener: GestureEventListener): () => void {
    return this.subscribe(type, 'START', listener);
  }

  /**
   * Subscribe to gesture UPDATE lifecycle
   */
  public onUpdate(type: SemanticGestureType | '*', listener: GestureEventListener): () => void {
    return this.subscribe(type, 'UPDATE', listener);
  }

  /**
   * Subscribe to gesture END lifecycle
   */
  public onEnd(type: SemanticGestureType | '*', listener: GestureEventListener): () => void {
    return this.subscribe(type, 'END', listener);
  }

  /**
   * Subscribe to discrete TRIGGER event
   */
  public onTrigger(type: SemanticGestureType | '*', listener: GestureEventListener): () => void {
    return this.subscribe(type, 'TRIGGER', listener);
  }

  /**
   * Subscribe to specific gesture type and lifecycle
   */
  public subscribe(
    type: SemanticGestureType | '*',
    lifecycle: GestureLifecycle | '*',
    listener: GestureEventListener
  ): () => void {
    const key = this.getKey(type, lifecycle);
    if (!this.lifecycleListeners.has(key)) {
      this.lifecycleListeners.set(key, new Set());
    }
    this.lifecycleListeners.get(key)!.add(listener);

    return () => {
      const set = this.lifecycleListeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.lifecycleListeners.delete(key);
        }
      }
    };
  }

  /**
   * Subscribe to all gesture events
   */
  public onAny(listener: GestureEventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Dispatch a typed gesture event to matching subscribers
   */
  public dispatch(event: GestureEvent): void {
    const specificKey = this.getKey(event.type, event.lifecycle);
    const anyTypeKey = this.getKey('*', event.lifecycle);
    const anyLifecycleKey = this.getKey(event.type, '*');
    const allWildcardKey = this.getKey('*', '*');

    const invokeSet = (key: string) => {
      const set = this.lifecycleListeners.get(key);
      if (set) {
        set.forEach((listener) => {
          try {
            listener(event);
          } catch (err) {
            console.error(`Error in GestureEventBus listener for "${key}":`, err);
          }
        });
      }
    };

    invokeSet(specificKey);
    invokeSet(anyTypeKey);
    invokeSet(anyLifecycleKey);
    invokeSet(allWildcardKey);

    this.wildcardListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in GestureEventBus wildcard listener:', err);
      }
    });
  }

  public clear(): void {
    this.lifecycleListeners.clear();
    this.wildcardListeners.clear();
  }
}
