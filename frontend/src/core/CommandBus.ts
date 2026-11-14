import { CommandType, CommandPayloadMap, UniverseCommand, CommandSource } from '../types/events';

type CommandListener<K extends CommandType> = (command: UniverseCommand<K>) => void;
type AnyCommandListener = (command: UniverseCommand) => void;

/**
 * Centralized Typed Event/Command Bus
 * Decouples input producers (Gestures, Fallbacks, Voice AI, UI) from consumers (WorldState, Physics, UI)
 */
export class CommandBus {
  private static instance: CommandBus;
  private listeners: Map<CommandType, Set<CommandListener<any>>> = new Map();
  private wildcardListeners: Set<AnyCommandListener> = new Set();

  private constructor() {}

  public static getInstance(): CommandBus {
    if (!CommandBus.instance) {
      CommandBus.instance = new CommandBus();
    }
    return CommandBus.instance;
  }

  /**
   * Dispatch a typed command to all registered listeners
   */
  public dispatch<K extends CommandType>(
    type: K,
    payload: CommandPayloadMap[K],
    source: CommandSource = 'SYSTEM'
  ): void {
    const command: UniverseCommand<K> = {
      type,
      payload,
      source,
      timestamp: performance.now()
    };

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(command);
        } catch (err) {
          console.error(`Error executing listener for command "${type}":`, err);
        }
      });
    }

    this.wildcardListeners.forEach((listener) => {
      try {
        listener(command);
      } catch (err) {
        console.error(`Error executing wildcard listener for command "${type}":`, err);
      }
    });
  }

  /**
   * Subscribe to a specific command type
   */
  public on<K extends CommandType>(type: K, listener: CommandListener<K>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.off(type, listener);
    };
  }

  /**
   * Subscribe to all dispatched commands
   */
  public onAny(listener: AnyCommandListener): () => void {
    this.wildcardListeners.add(listener);
    return () => {
      this.wildcardListeners.delete(listener);
    };
  }

  /**
   * Unsubscribe a listener
   */
  public off<K extends CommandType>(type: K, listener: CommandListener<K>): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  /**
   * Remove all listeners
   */
  public clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }
}
