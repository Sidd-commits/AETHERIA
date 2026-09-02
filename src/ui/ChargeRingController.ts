import { getRequiredElement } from '../utils/dom';
import { UniverseState } from '../types/universe';

/**
 * Charge Ring Controller
 * Manages the floating SVG circular charge meter and percentage readout
 */
export class ChargeRingController {
  private chargeHud: HTMLElement;
  private meterBar: SVGCircleElement;
  private chargeLabel: HTMLElement;
  private maxOffset: number = 377; // 2 * PI * 60

  constructor() {
    this.chargeHud = getRequiredElement<HTMLElement>('charge-hud');
    this.meterBar = getRequiredElement<SVGCircleElement>('charge-meter-bar');
    this.chargeLabel = getRequiredElement<HTMLElement>('charge-label');
  }

  public update(state: Readonly<UniverseState>): void {
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
