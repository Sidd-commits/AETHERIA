import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import {
  AIActionType,
  AIStructuredCommand,
  CommandHistoryItem,
  SimulationContext,
  VoiceState
} from '../types/ai';
import { CommandValidator } from './validation/CommandValidator';
import { AIAdapterRegistry } from './adapters/AICommandAdapter';
import { HeuristicLocalAdapter } from './adapters/HeuristicLocalAdapter';
import { OpenAICompatibleAdapter } from './adapters/OpenAICompatibleAdapter';
import { SpeechRecognitionEngine } from './voice/SpeechRecognitionEngine';

/**
 * AI Manager
 * Coordinates Speech Recognition, Provider-Agnostic AI Adapters, Strict Command Validation,
 * Safety Confirmation Guards, Command History, and CommandBus Dispatch.
 *
 * GUARANTEE: NEVER modifies Three.js or simulation state directly.
 */
export class AIManager {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private speechEngine: SpeechRecognitionEngine;
  private adapterRegistry: AIAdapterRegistry;

  private voiceState: VoiceState = 'IDLE';
  private history: CommandHistoryItem[] = [];
  private pendingDestructiveCommand: AIStructuredCommand | null = null;
  private stateChangeListeners: Set<
    (
      state: VoiceState,
      details?: { transcript?: string; error?: string; command?: AIStructuredCommand }
    ) => void
  > = new Set();

  constructor(worldState: WorldState, commandBus: CommandBus = CommandBus.getInstance()) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    // 1. Initialize Adapters
    this.adapterRegistry = AIAdapterRegistry.getInstance();
    this.adapterRegistry.register(new HeuristicLocalAdapter());
    this.adapterRegistry.register(new OpenAICompatibleAdapter());

    // 2. Initialize Speech Recognition Engine
    this.speechEngine = new SpeechRecognitionEngine();
    this.setupSpeechCallbacks();
  }

  private setupSpeechCallbacks(): void {
    this.speechEngine.setCallbacks({
      onStart: () => {
        this.setState('LISTENING');
      },
      onInterim: (transcript) => {
        this.setState('TRANSCRIBING', { transcript });
      },
      onFinal: (transcript) => {
        this.processNaturalLanguageInput(transcript);
      },
      onError: (errorMsg) => {
        this.setState('ERROR', { error: errorMsg });
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: `🎙️ ${errorMsg}`,
            icon: '⚠️'
          },
          'VOICE_AI'
        );
      },
      onEnd: () => {
        if (this.voiceState === 'LISTENING' || this.voiceState === 'TRANSCRIBING') {
          this.setState('IDLE');
        }
      }
    });
  }

  public getSpeechEngine(): SpeechRecognitionEngine {
    return this.speechEngine;
  }

  public getAdapterRegistry(): AIAdapterRegistry {
    return this.adapterRegistry;
  }

  public getVoiceState(): VoiceState {
    return this.voiceState;
  }

  public getHistory(): ReadonlyArray<CommandHistoryItem> {
    return this.history;
  }

  public getPendingDestructiveCommand(): AIStructuredCommand | null {
    return this.pendingDestructiveCommand;
  }

  public onStateChange(
    listener: (
      state: VoiceState,
      details?: { transcript?: string; error?: string; command?: AIStructuredCommand }
    ) => void
  ): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  private setState(
    state: VoiceState,
    details?: { transcript?: string; error?: string; command?: AIStructuredCommand }
  ): void {
    this.voiceState = state;
    this.stateChangeListeners.forEach((l) => {
      try {
        l(state, details);
      } catch (err) {
        console.error('Error in VoiceState listener:', err);
      }
    });
  }

  /**
   * Process a natural language input (from Speech Recognition or Text Box)
   */
  public async processNaturalLanguageInput(text: string): Promise<void> {
    const transcript = (text || '').trim();
    if (!transcript) return;

    // Check if answering pending confirmation (e.g. "yes", "confirm", "no", "cancel")
    if (this.pendingDestructiveCommand) {
      const lower = transcript.toLowerCase();
      if (
        lower.includes('yes') ||
        lower.includes('confirm') ||
        lower.includes('proceed') ||
        lower.includes('do it')
      ) {
        this.confirmPendingDestructiveCommand();
        return;
      } else if (
        lower.includes('no') ||
        lower.includes('cancel') ||
        lower.includes('abort') ||
        lower.includes('stop')
      ) {
        this.cancelPendingDestructiveCommand();
        return;
      }
    }

    this.setState('REASONING', { transcript });

    const adapter = this.adapterRegistry.getActiveAdapter();
    const context = this.buildSimulationContext();

    // 1. Adapter Parse
    const parseResult = await adapter.parseCommand(transcript, context);

    if (!parseResult.success || !parseResult.command) {
      const errorMsg = parseResult.errorMessage || 'Unable to parse command.';
      this.recordHistory(transcript, null, 'REJECTED', errorMsg, [errorMsg], adapter.name);
      this.setState('ERROR', { transcript, error: errorMsg });

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `🤖 ${errorMsg}`,
          icon: '❓'
        },
        'VOICE_AI'
      );
      return;
    }

    // 2. Strict Schema Validation
    const validation = CommandValidator.validate(parseResult.command);

    if (!validation.isValid || !validation.sanitizedCommand) {
      const errorMsg = `Command validation failed: ${validation.errors.join(', ')}`;
      this.recordHistory(
        transcript,
        parseResult.command,
        'REJECTED',
        errorMsg,
        validation.errors,
        adapter.name
      );
      this.setState('ERROR', { transcript, error: errorMsg });

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `❌ Invalid Command: ${validation.errors[0]}`,
          icon: '❌'
        },
        'VOICE_AI'
      );
      return;
    }

    const command = validation.sanitizedCommand;

    // 3. Destructive Action Confirmation Guard
    if (command.isDestructive) {
      this.pendingDestructiveCommand = command;
      this.setState('CONFIRMING', { transcript, command });

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `⚠️ Destructive Action "${command.action}": Say "Confirm" or Click Confirm`,
          icon: '⚠️'
        },
        'VOICE_AI'
      );
      return;
    }

    // 4. Safe Execution
    this.executeCommand(command, transcript, adapter.name);
  }

  /**
   * Confirm and execute pending destructive operation
   */
  public confirmPendingDestructiveCommand(): void {
    if (!this.pendingDestructiveCommand) return;
    const cmd = this.pendingDestructiveCommand;
    this.pendingDestructiveCommand = null;
    const adapter = this.adapterRegistry.getActiveAdapter();
    this.executeCommand(cmd, cmd.rawTranscript || '', adapter.name);
  }

  /**
   * Cancel pending destructive operation
   */
  public cancelPendingDestructiveCommand(): void {
    if (!this.pendingDestructiveCommand) return;
    const cmd = this.pendingDestructiveCommand;
    this.pendingDestructiveCommand = null;
    const adapter = this.adapterRegistry.getActiveAdapter();

    this.recordHistory(
      cmd.rawTranscript || '',
      cmd,
      'CANCELLED',
      'Operation cancelled by user',
      undefined,
      adapter.name
    );
    this.setState('IDLE');

    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: '🛑 Action Cancelled',
        icon: '🛑'
      },
      'VOICE_AI'
    );
  }

  /**
   * Dispatches validated AI command strictly to CommandBus
   */
  private executeCommand(
    command: AIStructuredCommand,
    transcript: string,
    providerName: string
  ): void {
    this.setState('EXECUTING', { transcript, command });

    try {
      this.dispatchToBus(command);

      this.recordHistory(
        transcript,
        command,
        'SUCCESS',
        command.explanation || `Executed ${command.action}`,
        undefined,
        providerName
      );

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `✨ ${command.explanation || `Executed ${command.action}`}`,
          icon: '🤖'
        },
        'VOICE_AI'
      );

      setTimeout(() => {
        if (this.voiceState === 'EXECUTING') {
          this.setState('IDLE');
        }
      }, 1200);
    } catch (err: any) {
      const errorMsg = `Execution error: ${err.message}`;
      this.recordHistory(transcript, command, 'ERROR', errorMsg, [errorMsg], providerName);
      this.setState('ERROR', { transcript, error: errorMsg });

      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `❌ ${errorMsg}`,
          icon: '❌'
        },
        'VOICE_AI'
      );
    }
  }

  /**
   * Translates AI structured action into CommandBus typed dispatch
   */
  private dispatchToBus(command: AIStructuredCommand): void {
    const { action, parameters } = command;

    switch (action as AIActionType) {
      case 'CREATE_PLANET':
        this.commandBus.dispatch(
          'SPAWN_ENTITY',
          {
            entity: {
              type: 'PLANET',
              name: parameters.name || 'AI Planet',
              radius: parameters.radius || 0.35,
              mass: parameters.mass || 1.5,
              color: parameters.color || '#00f5a0',
              orbitalRadius: parameters.orbitalRadius || 4.5,
              position: parameters.position
            }
          },
          'VOICE_AI'
        );
        break;

      case 'CREATE_BLACK_HOLE':
        this.commandBus.dispatch(
          'SPAWN_BLACK_HOLE',
          {
            position: parameters.position,
            mass: parameters.mass || 120.0,
            radius: parameters.radius || 1.0,
            gravitationalInfluenceRadius: parameters.gravitationalInfluenceRadius || 30.0,
            accretionStrength: parameters.accretionStrength || 2.2
          },
          'VOICE_AI'
        );
        break;

      case 'CREATE_SUPERNOVA':
        this.commandBus.dispatch(
          'TRIGGER_SUPERNOVA',
          {
            power: parameters.power || 1.2,
            entityId: parameters.targetEntityId
          },
          'VOICE_AI'
        );
        break;

      case 'SET_COLOR_PALETTE':
        if (parameters.paletteIndex !== undefined) {
          this.commandBus.dispatch('SET_PALETTE', { index: parameters.paletteIndex }, 'VOICE_AI');
        } else {
          this.commandBus.dispatch('CYCLE_PALETTE', undefined, 'VOICE_AI');
        }
        break;

      case 'SET_GRAVITY':
      case 'ADJUST_GRAVITY':
        this.commandBus.dispatch(
          'SET_GRAVITY',
          {
            gravityConstant: parameters.gravityConstant,
            multiplier: parameters.multiplier
          },
          'VOICE_AI'
        );
        break;

      case 'ALIGN_ORBITS':
        this.commandBus.dispatch(
          'ALIGN_ORBITS',
          {
            center: parameters.center,
            speedMultiplier: parameters.speedMultiplier
          },
          'VOICE_AI'
        );
        break;

      case 'DESTROY_ENTITY':
      case 'CLEAR_ENTITIES':
        this.commandBus.dispatch(
          'DESTROY_ENTITY',
          {
            targetId: parameters.targetId,
            targetType: parameters.targetType,
            all: parameters.all
          },
          'VOICE_AI'
        );
        break;

      case 'PAUSE_SIMULATION':
        this.commandBus.dispatch('TOGGLE_PAUSE', { paused: true }, 'VOICE_AI');
        break;

      case 'RESUME_SIMULATION':
        this.commandBus.dispatch('TOGGLE_PAUSE', { paused: false }, 'VOICE_AI');
        break;

      case 'SET_TIME_SCALE':
        this.commandBus.dispatch('SET_TIME_SCALE', { scale: parameters.scale || 1.0 }, 'VOICE_AI');
        break;

      case 'SEED_LIFE':
        this.commandBus.dispatch('SEED_ORGANISMS', { count: parameters.count || 150 }, 'VOICE_AI');
        break;

      case 'SPAWN_ENERGY_BURST':
        this.commandBus.dispatch(
          'SPAWN_ENERGY_BURST',
          { count: parameters.count || 250 },
          'VOICE_AI'
        );
        break;

      case 'LOAD_PRESET':
        this.commandBus.dispatch('SET_UNIVERSE_PRESET', { preset: parameters.preset }, 'VOICE_AI');
        break;

      case 'RESET_UNIVERSE':
        this.commandBus.dispatch('RESET_UNIVERSE', undefined, 'VOICE_AI');
        break;

      default:
        console.warn(`Unmapped AI Action: ${action}`);
    }
  }

  private recordHistory(
    transcript: string,
    parsedCommand: AIStructuredCommand | null,
    status: CommandHistoryItem['status'],
    executionMessage?: string,
    validationErrors?: string[],
    providerName: string = 'Built-in'
  ): void {
    const item: CommandHistoryItem = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      transcript,
      parsedCommand,
      status,
      executionMessage,
      validationErrors,
      isDestructive: parsedCommand?.isDestructive || false,
      providerName
    };

    this.history.unshift(item);
    if (this.history.length > 50) {
      this.history.pop();
    }
  }

  private buildSimulationContext(): SimulationContext {
    const state = this.worldState.getState();
    return {
      dominantBodiesCount: 6,
      activePreset: state.activePreset,
      timeScale: state.timeScale,
      isPaused: state.isPaused,
      gravityConstant: 1.0,
      organismCount: 600,
      entities: []
    };
  }
}
