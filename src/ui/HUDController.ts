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
      if (!this.statusDot.classList.contains('active')) this.statusDot.classList.add('active');
    } else {
      if (this.statusDot.classList.contains('active')) this.statusDot.classList.remove('active');
    }

    const newStatus = state.statusMessage.toUpperCase();
    if (this.statusText.textContent !== newStatus) {
      this.statusText.textContent = newStatus;
    }

    // Mode Label
    const newMode = state.activeModeLabel.toUpperCase();
    if (this.modeLabel.textContent !== newMode) {
      this.modeLabel.textContent = newMode;
    }

    // Theme Label
    const palette = PALETTES[state.activePaletteIndex];
    if (palette) {
      const newTheme = `${palette.name.toUpperCase()} (${palette.count})`;
      if (this.themeLabel.textContent !== newTheme) {
        this.themeLabel.textContent = newTheme;
      }
    }
  }
}
