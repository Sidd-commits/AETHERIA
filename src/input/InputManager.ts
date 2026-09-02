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

  constructor(
    worldState: WorldState,
    commandBus: CommandBus = CommandBus.getInstance()
  ) {
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

  private onMouseMove = (e: MouseEvent): void => {
    const state = this.worldState.getState();
    if (!state.handTrackingActive) {
      const mouseX = (e.clientX / window.innerWidth - 0.5) * 10;
      const mouseY = -(e.clientY / window.innerHeight - 0.5) * 6;

      this.commandBus.dispatch('SET_TRANSFORM', {
        position: { x: mouseX, y: mouseY, z: 0 },
        rotation: { x: mouseY * 0.3, y: mouseX * 0.3, z: 0 }
      }, 'MOUSE_KEYBOARD');
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
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '💥 Mouse Supernova Exploded!',
          icon: '💥'
        }, 'MOUSE_KEYBOARD');
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

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key >= '0' && e.key <= '5') {
      const idx = parseInt(e.key, 10);
      this.commandBus.dispatch('SET_PALETTE', { index: idx }, 'MOUSE_KEYBOARD');
      this.commandBus.dispatch('SHOW_TOAST', {
        message: `🎨 Palette changed to ${PALETTES[idx].name}`,
        icon: '🎨'
      }, 'MOUSE_KEYBOARD');
    } else if (e.key === 'c' || e.key === 'C') {
      this.commandBus.dispatch('TOGGLE_WEBCAM_BACKGROUND', undefined, 'MOUSE_KEYBOARD');
    } else if (e.key === ' ') {
      this.commandBus.dispatch('TRIGGER_EXPLOSION', { power: 1.0 }, 'MOUSE_KEYBOARD');
      this.commandBus.dispatch('SHOW_TOAST', {
        message: '💥 Supernova Triggered!',
        icon: '💥'
      }, 'MOUSE_KEYBOARD');
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
