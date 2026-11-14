import { getOptionalElement } from '../utils/dom';
import { CommandBus } from '../core/CommandBus';

/**
 * Toast Notification Controller
 * Displays animated feedback messages with automatic dismissal
 */
export class ToastController {
  private toastElement: HTMLElement | null;
  private textElement: HTMLElement | null;
  private iconElement: HTMLElement | null;
  private timeoutId: number | null = null;

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.toastElement = getOptionalElement('toast-msg');
    this.textElement = getOptionalElement('toast-text');
    this.iconElement = getOptionalElement('toast-icon');

    commandBus.on('SHOW_TOAST', (cmd) => {
      this.show(cmd.payload.message, cmd.payload.icon);
    });
  }

  public show(message: string, icon: string = '✨'): void {
    if (!this.toastElement) return;

    if (this.textElement) this.textElement.innerText = message;
    if (this.iconElement) this.iconElement.innerText = icon;
    this.toastElement.classList.add('show');

    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.toastElement?.classList.remove('show');
      this.timeoutId = null;
    }, 2600);
  }
}
