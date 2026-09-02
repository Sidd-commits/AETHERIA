import * as THREE from 'three';
import { UniverseState } from '../types/universe';
import { CommandBus } from './CommandBus';
import { PALETTES } from '../config/palettes';
import { ANIMATION_CONFIG } from '../config/constants';

type StateChangeListener = (state: Readonly<UniverseState>) => void;

/**
 * Reactive World State Store
 * Manages the single source of truth for the Universe simulation
 */
export class WorldState {
  private state: UniverseState;
  private listeners: Set<StateChangeListener> = new Set();
  private commandBus: CommandBus;

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;

    this.state = {
      targetPosition: new THREE.Vector3(0, 0, 0),
      currentPosition: new THREE.Vector3(0, 0, 0),
      targetRotation: new THREE.Euler(0, 0, 0),
      currentRotation: new THREE.Euler(0, 0, 0),
      targetScale: 1.0,
      currentScale: 1.0,
      activePaletteIndex: 5, // Default Prismatic
      isCharging: false,
      chargeAmount: 0.0,
      isExploded: false,
      isWebcamBackground: false,
      handTrackingActive: false,
      statusMessage: 'INITIALIZING...',
      activeModeLabel: 'SEARCHING HANDS'
    };

    this.registerCommandHandlers();
  }

  private registerCommandHandlers(): void {
    this.commandBus.on('SET_PALETTE', (cmd) => {
      const idx = Math.max(0, Math.min(PALETTES.length - 1, cmd.payload.index));
      this.state.activePaletteIndex = idx;
      this.notify();
    });

    this.commandBus.on('CYCLE_PALETTE', () => {
      const nextIdx = (this.state.activePaletteIndex + 1) % PALETTES.length;
      this.state.activePaletteIndex = nextIdx;
      this.commandBus.dispatch('SHOW_TOAST', {
        message: `🎨 Theme: ${PALETTES[nextIdx].name}`
      }, 'SYSTEM');
      this.notify();
    });

    this.commandBus.on('SET_CHARGE', (cmd) => {
      this.state.isCharging = cmd.payload.charging;
      if (cmd.payload.amount !== undefined) {
        this.state.chargeAmount = Math.max(0, Math.min(1, cmd.payload.amount));
      }
      this.notify();
    });

    this.commandBus.on('TRIGGER_EXPLOSION', () => {
      this.state.isExploded = true;
      this.notify();
    });

    this.commandBus.on('SET_TRANSFORM', (cmd) => {
      const { position, rotation, scale } = cmd.payload;
      if (position) {
        if ('isVector3' in position) {
          this.state.targetPosition.copy(position as THREE.Vector3);
        } else {
          this.state.targetPosition.set(position.x, position.y, position.z);
        }
      }
      if (rotation) {
        if ('isEuler' in rotation) {
          this.state.targetRotation.copy(rotation as THREE.Euler);
        } else {
          this.state.targetRotation.set(rotation.x, rotation.y, rotation.z);
        }
      }
      if (scale !== undefined) {
        this.state.targetScale = scale;
      }
      this.notify();
    });

    this.commandBus.on('TOGGLE_WEBCAM_BACKGROUND', (cmd) => {
      const next = cmd.payload && cmd.payload.enabled !== undefined
        ? cmd.payload.enabled
        : !this.state.isWebcamBackground;
      this.state.isWebcamBackground = next;
      this.commandBus.dispatch('SHOW_TOAST', {
        message: next ? '📹 Webcam Fullscreen Background Enabled' : '🌑 Dark Space Background Restored'
      }, 'UI');
      this.notify();
    });

    this.commandBus.on('SET_TRACKING_STATUS', (cmd) => {
      this.state.handTrackingActive = cmd.payload.active;
      if (cmd.payload.message) {
        this.state.statusMessage = cmd.payload.message;
      }
      this.notify();
    });

    this.commandBus.on('SET_MODE_LABEL', (cmd) => {
      this.state.activeModeLabel = cmd.payload.label;
      this.notify();
    });
  }

  public getState(): Readonly<UniverseState> {
    return this.state;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      listener(this.state);
    });
  }

  /**
   * Update charge value tick (called during render loop)
   */
  public updateChargeTick(): number {
    if (this.state.isCharging) {
      this.state.chargeAmount = Math.min(1.0, this.state.chargeAmount + ANIMATION_CONFIG.chargeIncrement);
    } else {
      if (this.state.chargeAmount > 0) {
        this.state.chargeAmount = Math.max(0, this.state.chargeAmount - ANIMATION_CONFIG.chargeDecrement);
      }
    }
    return this.state.chargeAmount;
  }
}
