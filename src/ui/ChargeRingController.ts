import { getRequiredElement, getOptionalElement } from '../utils/dom';
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
    const circle =
      getOptionalElement<SVGCircleElement>('charge-meter-bar') ??
      getOptionalElement<SVGCircleElement>('charge-circle');
    if (!circle) {
      throw new Error('Required DOM element with id "charge-meter-bar" was not found.');
    }
    this.meterBar = circle;
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
