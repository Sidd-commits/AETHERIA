import { getOptionalElement } from '../utils/dom';
import { UniverseState } from '../types/universe';

/**
 * Charge Ring Controller
 * Manages the floating SVG circular charge meter and percentage readout
 * Uses resilient element resolution to prevent runtime crashes if DOM elements are absent.
 */
export class ChargeRingController {
  private chargeHud: HTMLElement | null;
  private meterBar: SVGCircleElement | null;
  private chargeLabel: HTMLElement | null;
  private maxOffset: number = 377; // 2 * PI * 60

  constructor() {
    this.chargeHud = getOptionalElement<HTMLElement>('charge-hud');
    this.meterBar =
      getOptionalElement<SVGCircleElement>('charge-meter-bar') ??
      getOptionalElement<SVGCircleElement>('charge-circle');
    this.chargeLabel = getOptionalElement<HTMLElement>('charge-label');
  }

  public update(state: Readonly<UniverseState>): void {
    if (!this.chargeHud || !this.meterBar || !this.chargeLabel) {
      return;
    }

    const { chargeAmount, isCharging } = state;

    if (isCharging || chargeAmount > 0.02) {
      this.chargeHud.style.opacity = '1';
      const offset = this.maxOffset * (1.0 - chargeAmount);
      this.meterBar.style.strokeDashoffset = `${offset}`;
      this.chargeLabel.innerText = `CHARGING ${Math.round(chargeAmount * 100)}%`;
    } else {
      this.chargeHud.style.opacity = '0';
    }
  }
}
