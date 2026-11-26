import { CommandBus } from '../core/CommandBus';
import { WorldState } from '../core/WorldState';
import { clamp } from '../utils/math';
import { PALETTES } from '../config/palettes';

/**
 * Input Manager
 * Manages Mouse, Touch, and Keyboard fallback interactions with automatic hand-tracking suppression
 */
export class InputManager {
  private commandBus: CommandBus;
  private worldState: WorldState;
  private isMouseDown: boolean = false;

  constructor(worldState: WorldState, commandBus: CommandBus = CommandBus.getInstance()) {
    this.worldState = worldState;
    this.commandBus = commandBus;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
  }

  private lastMousePos = { x: 0, y: 0 };

  private onMouseMove = (e: MouseEvent): void => {
    const mouseX = (e.clientX / window.innerWidth - 0.5) * 10;
    const mouseY = -(e.clientY / window.innerHeight - 0.5) * 6;
    this.lastMousePos = { x: mouseX, y: mouseY };

    const state = this.worldState.getState();
    if (!state.handTrackingActive) {
      this.commandBus.dispatch(
        'SET_TRANSFORM',
        {
          position: { x: mouseX, y: mouseY, z: 0 },
          rotation: { x: mouseY * 0.3, y: mouseX * 0.3, z: 0 }
        },
        'MOUSE_KEYBOARD'
      );
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('.interactive') || target.closest('button'))) {
      return;
    }

    const state = this.worldState.getState();
    if (!state.handTrackingActive) {
      this.isMouseDown = true;
      this.commandBus.dispatch('SET_CHARGE', { charging: true }, 'MOUSE_KEYBOARD');
    }
  };

  private onMouseUp = (): void => {
    if (this.isMouseDown) {
      this.isMouseDown = false;
      const charge = this.worldState.getState().chargeAmount;
      if (charge > 0.2) {
        this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: charge }, 'MOUSE_KEYBOARD');
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '💥 Mouse Supernova Exploded!',
            icon: '💥'
          },
          'MOUSE_KEYBOARD'
        );
      }
      this.commandBus.dispatch('SET_CHARGE', { charging: false }, 'MOUSE_KEYBOARD');
    }
  };

  private onWheel = (e: WheelEvent): void => {
    const state = this.worldState.getState();
    if (!state.handTrackingActive) {
      const newScale = clamp(state.targetScale - e.deltaY * 0.0015, 0.4, 3.0);
      this.commandBus.dispatch('SET_TRANSFORM', { scale: newScale }, 'MOUSE_KEYBOARD');
    }
  };

  private isTyping(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    return !!(
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    );
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isTyping(e)) return;

    if (e.key >= '0' && e.key <= '5') {
      const idx = parseInt(e.key, 10);
      this.commandBus.dispatch('SET_PALETTE', { index: idx }, 'MOUSE_KEYBOARD');
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: `🎨 Palette changed to ${PALETTES[idx].name}`,
          icon: '🎨'
        },
        'MOUSE_KEYBOARD'
      );
    } else if (e.key === 'c' || e.key === 'C') {
      this.commandBus.dispatch('TOGGLE_WEBCAM_BACKGROUND', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'b' || e.key === 'B') {
      this.commandBus.dispatch(
        'SPAWN_BLACK_HOLE',
        {
          position: { x: this.lastMousePos.x, y: this.lastMousePos.y, z: 0 },
          mass: 140.0,
          radius: 1.0,
          gravitationalInfluenceRadius: 30.0,
          accretionStrength: 2.2
        },
        'MOUSE_KEYBOARD'
      );
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '🕳️ Black Hole Spawned (Key B)!',
          icon: '🕳️'
        },
        'MOUSE_KEYBOARD'
      );
    } else if (e.key === 'w' || e.key === 'W') {
      this.commandBus.dispatch('TOGGLE_WORLD_GEN', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'i' || e.key === 'I') {
      this.commandBus.dispatch('TOGGLE_INSPECTOR', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'a' || e.key === 'A') {
      this.commandBus.dispatch('TOGGLE_AETHER_OBSERVATORY', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'd' || e.key === 'D') {
      this.commandBus.dispatch('TOGGLE_DEBUG', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'e' || e.key === 'E') {
      this.commandBus.dispatch('TOGGLE_POPULATION_MONITOR', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'v' || e.key === 'V') {
      this.commandBus.dispatch('TOGGLE_VOICE_AI', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'p' || e.key === 'P') {
      this.commandBus.dispatch('TOGGLE_PERF', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'h' || e.key === 'H') {
      this.commandBus.dispatch('CHRONO_TOGGLE_HUD', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'k' || e.key === 'K' || e.key === ' ') {
      if (e.key === ' ') {
        e.preventDefault();
      }
      this.commandBus.dispatch('TOGGLE_PAUSE', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'r' || e.key === 'R') {
      this.commandBus.dispatch('RESET_UNIVERSE', undefined, 'MOUSE_KEYBOARD');
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '🔄 Universe Reset to Initial Equilibrium',
          icon: '🔄'
        },
        'MOUSE_KEYBOARD'
      );
    } else if (e.key === 'x' || e.key === 'X') {
      this.commandBus.dispatch('TRIGGER_SUPERNOVA', { power: 1.2 }, 'MOUSE_KEYBOARD');
      this.commandBus.dispatch(
        'SHOW_TOAST',
        {
          message: '💥 Catastrophic Supernova Detonated!',
          icon: '💥'
        },
        'MOUSE_KEYBOARD'
      );
    } else if (e.key === 't' || e.key === 'T') {
      this.commandBus.dispatch('TOGGLE_ORBITAL_TRAJECTORIES', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'g' || e.key === 'G') {
      this.commandBus.dispatch('TOGGLE_SPACETIME_GRID', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'o' || e.key === 'O') {
      this.commandBus.dispatch('SET_INTEGRATOR_MODE', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === '[') {
      this.commandBus.dispatch('CHRONO_STEP', { delta: -1 }, 'MOUSE_KEYBOARD');
    } else if (e.key === ']') {
      this.commandBus.dispatch('CHRONO_STEP', { delta: 1 }, 'MOUSE_KEYBOARD');
    } else if (e.key === '\\' || e.key === 'Backspace') {
      this.commandBus.dispatch('CHRONO_SET_MODE', { mode: 'REVERSE' }, 'MOUSE_KEYBOARD');
    } else if (e.key === 'Home' || e.key === 'l' || e.key === 'L') {
      this.commandBus.dispatch('CHRONO_RESUME_LIVE', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 'j' || e.key === 'J') {
      this.commandBus.dispatch('CHRONO_REPLAY_LAST_EVENT', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === 's' || e.key === 'S') {
      this.commandBus.dispatch('CAPTURE_SCREENSHOT', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === '?') {
      this.commandBus.dispatch('TOGGLE_SHORTCUTS', undefined, 'MOUSE_KEYBOARD');
    }
  };

  public dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
