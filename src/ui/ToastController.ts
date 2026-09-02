import { getRequiredElement } from '../utils/dom';
import { CommandBus } from '../core/CommandBus';

/**
 * Toast Notification Controller
 * Displays animated feedback messages with automatic dismissal
 */
export class ToastController {
  private toastElement: HTMLElement;
  private textElement: HTMLElement;
  private iconElement: HTMLElement;
  private timeoutId: number | null = null;

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.toastElement = getRequiredElement('toast-msg');
    this.textElement = getRequiredElement('toast-text');
    this.iconElement = getRequiredElement('toast-icon');

    commandBus.on('SHOW_TOAST', (cmd) => {
      this.show(cmd.payload.message, cmd.payload.icon);
    });
  }

  public show(message: string, icon: string = '✨'): void {
    this.textElement.innerText = message;
    this.iconElement.innerText = icon;
    this.toastElement.classList.add('show');

    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.toastElement.classList.remove('show');
      this.timeoutId = null;
    }, 2600);
  }
}
