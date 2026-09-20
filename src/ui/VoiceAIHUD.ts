import { AIManager } from '../ai/AIManager';
import { CommandBus } from '../core/CommandBus';
import { AIStructuredCommand, VoiceState } from '../types/ai';

/**
 * Voice AI HUD Controller
 * Provides glassmorphic voice interface, live audio waveform visualizer,
 * real-time speech subtitles, structured JSON inspector, destructive confirmation modal,
 * command history drawer, and natural-language text input fallback.
 */
export class VoiceAIHUD {
  private aiManager: AIManager;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private isHistoryOpen: boolean = false;

  // DOM Elements
  private micBtn!: HTMLButtonElement;
  private statusBadge!: HTMLElement;
  private transcriptEl!: HTMLElement;
  private jsonBadgeEl!: HTMLElement;
  private jsonPreEl!: HTMLPreElement;
  private waveformContainer!: HTMLElement;
  private confirmModalEl!: HTMLElement;
  private historyDrawerEl!: HTMLElement;
  private historyListEl!: HTMLElement;
  private textInputEl!: HTMLInputElement;

  constructor(aiManager: AIManager, _commandBus: CommandBus = CommandBus.getInstance()) {
    this.aiManager = aiManager;
    this.container = document.createElement('div');
    this.container.id = 'voice-ai-hud';
    this.createUI();
    this.bindEvents();
    this.bindKeyboardShortcuts();
  }

  private createUI(): void {
    this.container.className = 'voice-ai-panel interactive';
    this.container.style.cssText = `
      position: absolute;
      top: 90px;
      left: 32px;
      width: 320px;
      background: rgba(10, 16, 28, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 242, 254, 0.3);
      border-radius: 20px;
      padding: 16px;
      z-index: 50;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 242, 254, 0.12);
      font-family: 'Outfit', sans-serif;
      color: #f0f4fc;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      user-select: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    this.container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px; filter: drop-shadow(0 0 8px #00f2fe);">🎙️</span>
          <div>
            <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff;">Voice AI Interface</div>
            <div style="font-size: 10px; color: #8a99ad;">Natural-Language Simulation Control</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="btn-toggle-voice-history" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #8a99ad; border-radius: 8px; font-size: 11px; padding: 3px 8px; cursor: pointer;" title="Toggle Command History">📜 History</button>
          <button id="btn-close-voice-hud" style="background: transparent; border: none; color: #8a99ad; cursor: pointer; font-size: 14px; padding: 2px 4px; line-height: 1;" title="Hide Voice HUD (Press 'V')">✕</button>
        </div>
      </div>

      <!-- Live Mic Trigger & Audio Waveform Banner -->
      <div style="display: flex; align-items: center; gap: 12px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 10px 12px;">
        <!-- Pulsing Mic Button -->
        <button id="btn-voice-mic" style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          border: none;
          color: #000000;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.5);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        " title="Click to Speak (or press 'V')">
          <span id="mic-icon">🎙️</span>
        </button>

        <!-- Status & Waveform -->
        <div style="flex: 1; overflow: hidden;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span id="voice-status-badge" style="font-size: 11px; font-weight: 600; color: #00f2fe; letter-spacing: 0.04em;">CLICK MIC TO SPEAK</span>
            <span style="font-size: 10px; color: #8a99ad;">Press [V]</span>
          </div>
          <!-- Waveform Visualizer Bars -->
          <div id="voice-waveform" style="display: flex; align-items: center; gap: 3px; height: 16px;">
            <div class="wave-bar" style="height: 4px;"></div>
            <div class="wave-bar" style="height: 6px;"></div>
            <div class="wave-bar" style="height: 12px;"></div>
            <div class="wave-bar" style="height: 8px;"></div>
            <div class="wave-bar" style="height: 14px;"></div>
            <div class="wave-bar" style="height: 10px;"></div>
            <div class="wave-bar" style="height: 16px;"></div>
            <div class="wave-bar" style="height: 8px;"></div>
            <div class="wave-bar" style="height: 4px;"></div>
          </div>
        </div>
      </div>

      <!-- Live Transcript Display -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px; min-height: 38px; display: flex; align-items: center;">
        <span id="voice-transcript-text" style="font-size: 12px; color: #8a99ad; font-style: italic;">"Speak a command or click an example below..."</span>
      </div>

      <!-- Quick Command Suggestion Chips -->
      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
        <button class="voice-chip" data-query="Create a planet.">🪐 + Planet</button>
        <button class="voice-chip" data-query="Make the universe blue.">🎨 Blue Theme</button>
        <button class="voice-chip" data-query="Increase gravity.">⚡ Gravity +</button>
        <button class="voice-chip" data-query="Create a black hole.">🕳️ Black Hole</button>
        <button class="voice-chip" data-query="Make all planets orbit the center.">🔄 Align Orbits</button>
        <button class="voice-chip" data-query="Seed life.">🌱 Seed Life</button>
        <button class="voice-chip" data-query="Create a supernova.">💥 Supernova</button>
      </div>

      <!-- Structured JSON Command Inspector (Collapsible) -->
      <div id="voice-json-container" style="display: none; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 10px; padding: 8px 10px; font-family: monospace; font-size: 10px; color: #00f5a0; max-height: 120px; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #8a99ad; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 2px;">
          <span>STRUCTURED COMMAND SCHEMA</span>
          <span>VALIDATED</span>
        </div>
        <pre id="voice-json-pre" style="margin: 0; white-space: pre-wrap; word-break: break-all;"></pre>
      </div>

      <!-- Destructive Confirmation Modal -->
      <div id="voice-confirm-modal" style="display: none; background: rgba(255, 8, 68, 0.15); border: 1px solid rgba(255, 8, 68, 0.4); border-radius: 12px; padding: 10px; animation: pulseRed 1.5s infinite ease-in-out;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #ff5e62; margin-bottom: 4px;">
          <span>⚠️</span>
          <span>Destructive Action Confirmation</span>
        </div>
        <div id="voice-confirm-desc" style="font-size: 11px; color: #f0f4fc; margin-bottom: 8px;">Are you sure you want to execute this operation?</div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-confirm-voice" style="flex: 1; background: #ff0844; color: #ffffff; border: none; border-radius: 6px; padding: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Confirm Operation</button>
          <button id="btn-cancel-voice" style="flex: 1; background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 6px; font-size: 11px; cursor: pointer;">Cancel</button>
        </div>
      </div>

      <!-- Natural-Language Text Input Fallback -->
      <div style="display: flex; gap: 6px;">
        <input id="input-voice-text" type="text" placeholder="Type prompt & press Enter..." style="
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 6px 10px;
          font-family: inherit;
          font-size: 11px;
          color: #ffffff;
          outline: none;
        " />
        <button id="btn-submit-voice-text" style="
          background: rgba(0, 242, 254, 0.2);
          border: 1px solid rgba(0, 242, 254, 0.4);
          color: #00f2fe;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">Send</button>
      </div>

      <!-- Command History Drawer (Collapsible) -->
      <div id="voice-history-drawer" style="display: none; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 8px 10px; max-height: 140px; overflow-y: auto;">
        <div style="font-size: 10px; color: #8a99ad; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">Recent Commands</div>
        <div id="voice-history-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Add Waveform & Chip Styles
    const style = document.createElement('style');
    style.innerHTML = `
      .wave-bar {
        width: 3px;
        background: #00f2fe;
        border-radius: 2px;
        transition: height 0.08s ease, background 0.2s ease;
      }
      .voice-chip {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #c4d7f2;
        border-radius: 12px;
        padding: 3px 8px;
        font-family: 'Outfit', sans-serif;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .voice-chip:hover {
        background: rgba(0, 242, 254, 0.18);
        border-color: rgba(0, 242, 254, 0.4);
        color: #00f2fe;
        transform: translateY(-1px);
      }
      @keyframes pulseRed {
        0%, 100% { box-shadow: 0 0 10px rgba(255, 8, 68, 0.2); }
        50% { box-shadow: 0 0 20px rgba(255, 8, 68, 0.5); }
      }
    `;
    document.head.appendChild(style);

    // Cache elements
    this.micBtn = this.container.querySelector('#btn-voice-mic') as HTMLButtonElement;
    this.statusBadge = this.container.querySelector('#voice-status-badge') as HTMLElement;
    this.transcriptEl = this.container.querySelector('#voice-transcript-text') as HTMLElement;
    this.jsonBadgeEl = this.container.querySelector('#voice-json-container') as HTMLElement;
    this.jsonPreEl = this.container.querySelector('#voice-json-pre') as HTMLPreElement;
    this.waveformContainer = this.container.querySelector('#voice-waveform') as HTMLElement;
    this.confirmModalEl = this.container.querySelector('#voice-confirm-modal') as HTMLElement;
    this.historyDrawerEl = this.container.querySelector('#voice-history-drawer') as HTMLElement;
    this.historyListEl = this.container.querySelector('#voice-history-list') as HTMLElement;
    this.textInputEl = this.container.querySelector('#input-voice-text') as HTMLInputElement;

    // Hook audio waveform updates via addCallbacks
    this.aiManager.getSpeechEngine().addCallbacks({
      onAudioLevel: (level) => {
        this.updateWaveform(level);
      }
    });

    // Hook state changes
    this.aiManager.onStateChange((state, details) => {
      this.handleStateChange(state, details);
    });
  }

  private bindEvents(): void {
    // Mic Button
    this.micBtn.addEventListener('click', () => {
      this.toggleMic();
    });

    // Close HUD Button
    const closeBtn = this.container.querySelector('#btn-close-voice-hud');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggle();
      });
    }

    // Toggle History Drawer
    const historyBtn = this.container.querySelector('#btn-toggle-voice-history');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        this.isHistoryOpen = !this.isHistoryOpen;
        this.historyDrawerEl.style.display = this.isHistoryOpen ? 'block' : 'none';
        if (this.isHistoryOpen) this.renderHistory();
      });
    }

    // Voice Suggestion Chips
    const chips = this.container.querySelectorAll('.voice-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const query = (e.currentTarget as HTMLElement).dataset.query;
        if (query) {
          this.aiManager.processNaturalLanguageInput(query);
        }
      });
    });

    // Text Input Submit
    const submitBtn = this.container.querySelector('#btn-submit-voice-text');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitTextInput();
      });
    }

    this.textInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.submitTextInput();
      }
    });

    // Confirmation Modal Buttons
    const confirmBtn = this.container.querySelector('#btn-confirm-voice');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        this.aiManager.confirmPendingDestructiveCommand();
      });
    }

    const cancelBtn = this.container.querySelector('#btn-cancel-voice');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.aiManager.cancelPendingDestructiveCommand();
      });
    }
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v' || e.key === 'V') {
        this.toggle();
      }
    });
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.style.transform = 'translateX(0)';
      this.container.style.opacity = '1';
      this.container.style.pointerEvents = 'auto';
    } else {
      this.container.style.transform = 'translateX(-380px)';
      this.container.style.opacity = '0';
      this.container.style.pointerEvents = 'none';
      this.aiManager.getSpeechEngine().stop();
    }
    return this.isVisible;
  }

  public show(): void {
    if (!this.isVisible) this.toggle();
  }

  public hide(): void {
    if (this.isVisible) this.toggle();
  }

  public async toggleMic(): Promise<void> {
    if (!this.isVisible) this.show();
    await this.aiManager.getSpeechEngine().toggle();
  }

  private submitTextInput(): void {
    const val = this.textInputEl.value.trim();
    if (!val) return;
    this.textInputEl.value = '';
    this.aiManager.processNaturalLanguageInput(val);
  }

  private handleStateChange(
    state: VoiceState,
    details?: { transcript?: string; error?: string; command?: AIStructuredCommand }
  ): void {
    switch (state) {
      case 'IDLE':
        this.statusBadge.textContent = 'READY TO LISTEN';
        this.statusBadge.style.color = '#00f2fe';
        this.micBtn.style.boxShadow = '0 0 16px rgba(0, 242, 254, 0.5)';
        this.micBtn.style.background = 'linear-gradient(135deg, #00f2fe, #4facfe)';
        this.confirmModalEl.style.display = 'none';
        break;

      case 'LISTENING':
        this.statusBadge.textContent = '🎙️ LISTENING...';
        this.statusBadge.style.color = '#00f5a0';
        this.transcriptEl.textContent = 'Listening to your voice...';
        this.transcriptEl.style.color = '#00f5a0';
        this.micBtn.style.boxShadow = '0 0 25px rgba(0, 245, 160, 0.8)';
        this.micBtn.style.background = 'linear-gradient(135deg, #00f5a0, #00d2ff)';
        this.confirmModalEl.style.display = 'none';
        break;

      case 'TRANSCRIBING':
        this.statusBadge.textContent = 'TRANSCRIBING...';
        this.statusBadge.style.color = '#ffd200';
        if (details?.transcript) {
          this.transcriptEl.textContent = `"${details.transcript}"`;
          this.transcriptEl.style.color = '#ffffff';
        }
        break;

      case 'REASONING':
        this.statusBadge.textContent = '🧠 REASONING & VALIDATING...';
        this.statusBadge.style.color = '#c084fc';
        if (details?.transcript) {
          this.transcriptEl.textContent = `"${details.transcript}"`;
          this.transcriptEl.style.color = '#ffffff';
        }
        break;

      case 'CONFIRMING':
        this.statusBadge.textContent = '⚠️ CONFIRMATION REQUIRED';
        this.statusBadge.style.color = '#ff5e62';
        this.confirmModalEl.style.display = 'block';
        if (details?.command) {
          const descEl = this.confirmModalEl.querySelector('#voice-confirm-desc');
          if (descEl)
            descEl.textContent =
              details.command.explanation ||
              `Execute destructive operation "${details.command.action}"?`;
        }
        break;

      case 'EXECUTING':
        this.statusBadge.textContent = '✨ EXECUTING COMMAND';
        this.statusBadge.style.color = '#00f5a0';
        this.confirmModalEl.style.display = 'none';
        if (details?.command) {
          this.showJsonCommand(details.command);
        }
        break;

      case 'ERROR':
        this.statusBadge.textContent = '❌ ERROR';
        this.statusBadge.style.color = '#ff5e62';
        if (details?.error) {
          this.transcriptEl.textContent = details.error;
          this.transcriptEl.style.color = '#ff5e62';
        }
        break;
    }

    this.renderHistory();
  }

  private showJsonCommand(command: AIStructuredCommand): void {
    this.jsonBadgeEl.style.display = 'block';
    this.jsonPreEl.textContent = JSON.stringify(
      {
        action: command.action,
        parameters: command.parameters,
        confidence: command.confidence,
        explanation: command.explanation
      },
      null,
      2
    );
  }

  private updateWaveform(level: number): void {
    const bars = this.waveformContainer.querySelectorAll('.wave-bar') as NodeListOf<HTMLElement>;
    bars.forEach((bar, idx) => {
      const height = Math.max(4, Math.min(16, level * 16 * (0.5 + Math.sin(idx * 0.8) * 0.5)));
      bar.style.height = `${height}px`;
    });
  }

  private renderHistory(): void {
    if (!this.historyListEl) return;
    const history = this.aiManager.getHistory();

    if (history.length === 0) {
      this.historyListEl.innerHTML =
        '<div style="font-size: 11px; color: #8a99ad;">No commands yet.</div>';
      return;
    }

    this.historyListEl.innerHTML = history
      .slice(0, 6)
      .map((item) => {
        const isSuccess = item.status === 'SUCCESS';
        const color = isSuccess ? '#00f5a0' : item.status === 'CANCELLED' ? '#ffd200' : '#ff5e62';
        const icon = isSuccess ? '✓' : item.status === 'CANCELLED' ? '🛑' : '✕';

        return `
          <div style="background: rgba(255,255,255,0.03); border-left: 2px solid ${color}; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #ffffff; font-weight: 500;">"${item.transcript}"</span>
              <span style="color: ${color}; font-size: 10px; font-weight: 600;">${icon} ${item.status}</span>
            </div>
            ${item.parsedCommand ? `<div style="font-size: 10px; color: #8a99ad; margin-top: 2px;">→ ${item.parsedCommand.action}</div>` : ''}
          </div>
        `;
      })
      .join('');
  }
}
