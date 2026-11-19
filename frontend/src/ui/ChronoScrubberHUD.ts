import { CommandBus } from '../core/CommandBus';
import { UniverseSnapshot } from '../types/universe';

/**
 * ChronoWarp Scrubber HUD
 * Sleek glassmorphism temporal control deck for interactive time-scrubbing,
 * cosmic reverse playback, and event marker replay.
 */
export class ChronoScrubberHUD {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private sliderEl: HTMLInputElement | null = null;
  private readoutEl: HTMLElement | null = null;
  private rewindBtn: HTMLButtonElement | null = null;
  private liveBtn: HTMLButtonElement | null = null;
  private replayBtn: HTMLButtonElement | null = null;
  private isUserScrubbing: boolean = false;
  private lastRenderedOffset: string = '';

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;
    this.container = document.createElement('div');
    this.container.id = 'chrono-scrubber-bar';
    this.createUI();
    this.bindEvents();
  }

  private createUI(): void {
    this.container.className = 'chrono-scrubber-panel interactive';
    this.container.style.cssText = `
      position: absolute;
      bottom: 78px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 14, 24, 0.82);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 242, 254, 0.28);
      border-radius: 36px;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 46;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      color: #e2e8f0;
      max-width: min(840px, calc(100vw - 32px));
      transition: all 0.25s ease;
      white-space: nowrap;
    `;

    this.container.innerHTML = `
      <!-- Brand & Mode Pill -->
      <div style="display: flex; align-items: center; gap: 6px; padding-right: 6px; border-right: 1px solid rgba(255,255,255,0.12);">
        <span style="font-size: 13px;">⏳</span>
        <span style="font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00f2fe;">ChronoWarp</span>
      </div>

      <!-- Rewind / Reverse Toggle -->
      <button id="btn-chrono-rewind" class="action-btn" style="padding: 5px 10px; border-radius: 18px; background: rgba(0, 242, 254, 0.12); border: 1px solid rgba(0, 242, 254, 0.3);" title="Toggle Reverse Time Playback (Backspace / \\)">
        <span id="chrono-rewind-icon">⏪</span>
        <span id="chrono-rewind-text">Rewind</span>
      </button>

      <!-- Step Backward 1 Frame -->
      <button id="btn-chrono-step-back" class="action-btn" style="padding: 5px 9px; border-radius: 18px;" title="Step 1 Frame Backward ([ key)">
        <span>◀ -1F</span>
      </button>

      <!-- Scrubbing Slider -->
      <div style="display: flex; align-items: center; gap: 8px; flex-grow: 1; min-width: 140px; max-width: 280px;">
        <input
          type="range"
          id="chrono-range-slider"
          min="0"
          max="1000"
          value="1000"
          style="
            width: 100%;
            height: 5px;
            accent-color: #00f2fe;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
            cursor: pointer;
            outline: none;
          "
          title="Drag to scrub universe simulation timeline"
        />
      </div>

      <!-- Step Forward 1 Frame -->
      <button id="btn-chrono-step-fwd" class="action-btn" style="padding: 5px 9px; border-radius: 18px;" title="Step 1 Frame Forward (] key)">
        <span>+1F ▶</span>
      </button>

      <!-- Return to Live Button -->
      <button id="btn-chrono-live" class="action-btn active-live" style="padding: 5px 12px; border-radius: 18px; font-weight: 600; display: flex; align-items: center; gap: 5px;" title="Return to Real-Time Simulation (Home / L key)">
        <span id="chrono-live-dot" style="width: 7px; height: 7px; border-radius: 50%; background: #00f5a0; box-shadow: 0 0 8px #00f5a0;"></span>
        <span id="chrono-live-label">LIVE</span>
      </button>

      <!-- Replay Last Supernova Bookmark -->
      <button id="btn-chrono-replay-event" class="action-btn" style="padding: 5px 10px; border-radius: 18px; background: rgba(255, 8, 68, 0.15); border: 1px solid rgba(255, 8, 68, 0.35); display: none;" title="Rewind to moment before last supernova explosion">
        <span>↺</span>
        <span>Replay Supernova</span>
      </button>

      <!-- Real-Time Time Offset Readout -->
      <div id="chrono-offset-readout" style="
        font-family: monospace;
        font-size: 11px;
        color: #00f5a0;
        min-width: 65px;
        text-align: right;
        padding-left: 4px;
        border-left: 1px solid rgba(255, 255, 255, 0.12);
      ">
        LIVE
      </div>
    `;

    document.body.appendChild(this.container);

    this.sliderEl = document.getElementById('chrono-range-slider') as HTMLInputElement;
    this.readoutEl = document.getElementById('chrono-offset-readout');
    this.rewindBtn = document.getElementById('btn-chrono-rewind') as HTMLButtonElement;
    this.liveBtn = document.getElementById('btn-chrono-live') as HTMLButtonElement;
    this.replayBtn = document.getElementById('btn-chrono-replay-event') as HTMLButtonElement;
  }

  private bindEvents(): void {
    // 1. Slider Scrubbing Input
    this.sliderEl?.addEventListener('input', (e) => {
      this.isUserScrubbing = true;
      const val = parseFloat((e.target as HTMLInputElement).value) / 1000.0;
      this.commandBus.dispatch('CHRONO_SCRUB', { ratio: val }, 'UI');
    });

    this.sliderEl?.addEventListener('change', () => {
      this.isUserScrubbing = false;
    });

    // 2. Rewind Toggle Button
    this.rewindBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CHRONO_SET_MODE', { mode: 'REVERSE' }, 'UI');
    });

    // 3. Step Back Button
    const stepBackBtn = document.getElementById('btn-chrono-step-back');
    stepBackBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CHRONO_STEP', { delta: -1 }, 'UI');
    });

    // 4. Step Forward Button
    const stepFwdBtn = document.getElementById('btn-chrono-step-fwd');
    stepFwdBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CHRONO_STEP', { delta: 1 }, 'UI');
    });

    // 5. Live Button
    this.liveBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CHRONO_RESUME_LIVE', undefined, 'UI');
      if (this.sliderEl) this.sliderEl.value = '1000';
    });

    // 6. Replay Last Event Button
    this.replayBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('CHRONO_REPLAY_LAST_EVENT', undefined, 'UI');
    });

    // 7. Keyboard Shortcut (H)
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'h' || e.key === 'H') {
        this.toggle();
      }
    });
  }

  /**
   * Called per frame by RenderLoop to update timeline scrubber telemetry
   */
  public update(snapshot: UniverseSnapshot): void {
    const chrono = snapshot.chrono;
    if (!chrono) return;

    // Show/hide Replay Supernova button if event markers exist
    if (this.replayBtn) {
      if (chrono.markersCount > 0) {
        this.replayBtn.style.display = 'inline-flex';
      } else {
        this.replayBtn.style.display = 'none';
      }
    }

    // Update Slider position if user is not currently dragging it
    if (!this.isUserScrubbing && this.sliderEl) {
      if (chrono.isLive) {
        this.sliderEl.value = '1000';
      } else if (chrono.totalRecordedFrames > 1) {
        const span = Math.max(0.001, chrono.newestSimTime - chrono.oldestSimTime);
        const progress = Math.max(0, Math.min(1, (chrono.currentSimTime - chrono.oldestSimTime) / span));
        this.sliderEl.value = Math.round(progress * 1000).toString();
      }
    }

    // Update Live / Scrubbing styles and readout
    if (chrono.isLive) {
      if (this.lastRenderedOffset !== 'LIVE') {
        this.lastRenderedOffset = 'LIVE';
        if (this.readoutEl) {
          this.readoutEl.textContent = 'LIVE';
          this.readoutEl.style.color = '#00f5a0';
        }
        if (this.liveBtn) {
          this.liveBtn.style.background = 'rgba(0, 245, 160, 0.18)';
          this.liveBtn.style.borderColor = 'rgba(0, 245, 160, 0.4)';
        }
        if (this.rewindBtn) {
          this.rewindBtn.style.background = 'rgba(0, 242, 254, 0.12)';
          this.rewindBtn.style.borderColor = 'rgba(0, 242, 254, 0.3)';
          const textEl = document.getElementById('chrono-rewind-text');
          if (textEl) textEl.textContent = 'Rewind';
        }
      }
    } else {
      const offsetStr = `${chrono.timeOffsetSec.toFixed(2)}s`;
      if (this.lastRenderedOffset !== offsetStr) {
        this.lastRenderedOffset = offsetStr;
        if (this.readoutEl) {
          this.readoutEl.textContent = offsetStr;
          this.readoutEl.style.color = chrono.mode === 'REVERSE' ? '#ff0844' : '#fee140';
        }
        if (this.liveBtn) {
          this.liveBtn.style.background = 'rgba(255, 255, 255, 0.05)';
          this.liveBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
        if (this.rewindBtn) {
          if (chrono.mode === 'REVERSE') {
            this.rewindBtn.style.background = 'rgba(255, 8, 68, 0.25)';
            this.rewindBtn.style.borderColor = 'rgba(255, 8, 68, 0.6)';
            const textEl = document.getElementById('chrono-rewind-text');
            if (textEl) textEl.textContent = 'Pause ⏪';
          } else {
            this.rewindBtn.style.background = 'rgba(0, 242, 254, 0.12)';
            this.rewindBtn.style.borderColor = 'rgba(0, 242, 254, 0.3)';
            const textEl = document.getElementById('chrono-rewind-text');
            if (textEl) textEl.textContent = 'Rewind';
          }
        }
      }
    }
  }

  public toggle(): boolean {
    const isHidden = this.container.style.display === 'none';
    this.container.style.display = isHidden ? 'flex' : 'none';
    return isHidden;
  }
}
