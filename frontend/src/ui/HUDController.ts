import { getOptionalElement } from '../utils/dom';
import { UniverseState } from '../types/universe';
import { PALETTES } from '../config/palettes';

/**
 * HUD Controller
 * Manages top brand indicators, tracking status dot, active gesture mode, and theme labels
 */
export class HUDController {
  private statusDot: HTMLElement | null;
  private statusText: HTMLElement | null;
  private modeLabel: HTMLElement | null;
  private themeLabel: HTMLElement | null;

  constructor() {
    this.statusDot = getOptionalElement('cam-status-dot');
    this.statusText = getOptionalElement('cam-status-text');
    this.modeLabel = getOptionalElement('active-mode-label');
    this.themeLabel = getOptionalElement('active-theme-label');
  }

  public update(state: Readonly<UniverseState>): void {
    // Tracking Status Dot & Label
    if (this.statusDot) {
      if (state.handTrackingActive) {
        if (!this.statusDot.classList.contains('active')) this.statusDot.classList.add('active');
      } else {
        if (this.statusDot.classList.contains('active')) this.statusDot.classList.remove('active');
      }
    }

    if (this.statusText) {
      const newStatus = state.statusMessage.toUpperCase();
      if (this.statusText.textContent !== newStatus) {
        this.statusText.textContent = newStatus;
      }
    }

    // Mode Label
    if (this.modeLabel) {
      const newMode = state.activeModeLabel.toUpperCase();
      if (this.modeLabel.textContent !== newMode) {
        this.modeLabel.textContent = newMode;
      }
    }

    // Theme Label
    if (this.themeLabel) {
      const palette = PALETTES[state.activePaletteIndex];
      if (palette) {
        const newTheme = `${palette.name.toUpperCase()} (${palette.count})`;
        if (this.themeLabel.textContent !== newTheme) {
          this.themeLabel.textContent = newTheme;
        }
      }
    }
  }
}
