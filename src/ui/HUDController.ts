import { getRequiredElement } from '../utils/dom';
import { UniverseState } from '../types/universe';
import { PALETTES } from '../config/palettes';

/**
 * HUD Controller
 * Manages top brand indicators, tracking status dot, active gesture mode, and theme labels
 */
export class HUDController {
  private statusDot: HTMLElement;
  private statusText: HTMLElement;
  private modeLabel: HTMLElement;
  private themeLabel: HTMLElement;

  constructor() {
    this.statusDot = getRequiredElement('cam-status-dot');
    this.statusText = getRequiredElement('cam-status-text');
    this.modeLabel = getRequiredElement('active-mode-label');
    this.themeLabel = getRequiredElement('active-theme-label');
  }

  public update(state: Readonly<UniverseState>): void {
    // Tracking Status Dot & Label
    if (state.handTrackingActive) {
      this.statusDot.classList.add('active');
    } else {
      this.statusDot.classList.remove('active');
    }
    this.statusText.innerText = state.statusMessage.toUpperCase();

    // Mode Label
    this.modeLabel.innerText = state.activeModeLabel.toUpperCase();

    // Theme Label
    const palette = PALETTES[state.activePaletteIndex];
    if (palette) {
      this.themeLabel.innerText = `${palette.name.toUpperCase()} (${palette.count})`;
    }
  }
}
