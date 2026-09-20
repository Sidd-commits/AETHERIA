import { CommandBus } from '../core/CommandBus';
import { UniversePresetId } from '../types/universe';

/**
 * Universe Controls UI Panel
 * Provides Pause/Resume, Time-Scaling (0.25x - 5x), Procedural Presets, and Reset.
 */
export class UniverseControls {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private isPaused: boolean = false;
  private currentPreset: UniversePresetId = 'SOLAR_SYSTEM';

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;
    this.container = document.createElement('div');
    this.container.id = 'universe-controls-bar';
    this.createUI();
    this.bindKeyboardShortcuts();
  }

  private createUI(): void {
    this.container.className = 'universe-controls-panel interactive';
    this.container.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(12, 16, 24, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 40px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 45;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      font-size: 12px;
      color: #f0f4fc;
    `;

    this.container.innerHTML = `
      <!-- Play/Pause Button -->
      <button id="btn-uni-pause" class="action-btn" style="padding: 6px 14px; border-radius: 20px;" title="Pause/Resume Simulation (Spacebar)">
        <span id="uni-pause-icon">⏸️</span>
        <span id="uni-pause-text">Pause</span>
      </button>

      <!-- Time Scale Selector -->
      <div style="display: flex; align-items: center; gap: 4px; border-left: 1px solid rgba(255,255,255,0.1); border-right: 1px solid rgba(255,255,255,0.1); padding: 0 10px;">
        <span style="color: #8a99ad; font-size: 11px; margin-right: 2px;">SPEED:</span>
        <button class="speed-btn active-speed" data-speed="1.0">1x</button>
        <button class="speed-btn" data-speed="0.25">0.25x</button>
        <button class="speed-btn" data-speed="0.5">0.5x</button>
        <button class="speed-btn" data-speed="2.0">2x</button>
        <button class="speed-btn" data-speed="5.0">5x</button>
      </div>

      <!-- Presets Dropdown -->
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #8a99ad; font-size: 11px;">PRESET:</span>
        <select id="select-uni-preset" style="
          background: rgba(20, 26, 38, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #00f2fe;
          border-radius: 12px;
          padding: 6px 12px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
        ">
          <option value="SOLAR_SYSTEM">☀️ Solar System</option>
          <option value="BINARY_STARS_NEBULA">✨ Binary Stars & Nebula</option>
          <option value="BLACK_HOLE_ACCRETION">🕳️ Black Hole Accretion</option>
          <option value="CHAOS_GALAXY">🌌 Chaos Galaxy</option>
          <option value="AETHERIA_LATTICE">🕸️ Aetheria Lattice</option>
        </select>
      </div>

      <!-- Quick Spawn Black Hole Button -->
      <button id="btn-spawn-bh-quick" class="action-btn" style="padding: 6px 12px; border-radius: 20px; background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.35);" title="Spawn Black Hole (B key / Fist Vortex)">
        <span>🕳️</span>
        <span>+ Black Hole</span>
      </button>

      <!-- Supernova Explosion Button -->
      <button id="btn-explode-demo" class="action-btn" style="padding: 6px 12px; border-radius: 20px; background: rgba(255, 8, 68, 0.15); border: 1px solid rgba(255, 8, 68, 0.35);" title="Trigger Supernova Explosion (X key)">
        <span>💥</span>
        <span>Supernova</span>
      </button>

      <!-- Reset Button -->
      <button id="btn-uni-reset" class="action-btn" style="padding: 6px 12px; border-radius: 20px;" title="Reset Universe (R key)">
        <span>🔄</span>
        <span>Reset</span>
      </button>
    `;

    document.body.appendChild(this.container);

    // Style speed buttons
    const style = document.createElement('style');
    style.innerHTML = `
      .speed-btn {
        background: transparent;
        border: 1px solid transparent;
        color: #8a99ad;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .speed-btn:hover {
        color: #ffffff;
        background: rgba(255,255,255,0.08);
      }
      .speed-btn.active-speed {
        background: rgba(0, 242, 254, 0.2);
        color: #00f2fe;
        border-color: rgba(0, 242, 254, 0.4);
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);

    this.bindEvents();
  }

  private bindEvents(): void {
    // 1. Pause Button
    const pauseBtn = document.getElementById('btn-uni-pause') as HTMLButtonElement;
    pauseBtn.addEventListener('click', () => {
      this.togglePause();
    });

    // 2. Speed Buttons
    const speedBtns = this.container.querySelectorAll('.speed-btn');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const speed = parseFloat(target.dataset.speed || '1.0');
        speedBtns.forEach((b) => b.classList.remove('active-speed'));
        target.classList.add('active-speed');
        this.setTimeScale(speed);
      });
    });

    // 3. Preset Selector
    const presetSelect = document.getElementById('select-uni-preset') as HTMLSelectElement;
    presetSelect.addEventListener('change', (e) => {
      const preset = (e.target as HTMLSelectElement).value as UniversePresetId;
      this.setPreset(preset);
    });

    // 4. Quick Spawn Black Hole Button
    const spawnBhBtn = document.getElementById('btn-spawn-bh-quick') as HTMLButtonElement;
    if (spawnBhBtn) {
      spawnBhBtn.addEventListener('click', () => {
        this.commandBus.dispatch(
          'SPAWN_BLACK_HOLE',
          {
            position: {
              x: (Math.random() - 0.5) * 4,
              y: (Math.random() - 0.5) * 2,
              z: (Math.random() - 0.5) * 4
            },
            mass: 140.0,
            radius: 1.0,
            gravitationalInfluenceRadius: 30.0,
            accretionStrength: 2.2
          },
          'UI'
        );
        this.commandBus.dispatch(
          'SHOW_TOAST',
          {
            message: '🕳️ Black Hole Spawned!',
            icon: '🕳️'
          },
          'UI'
        );
      });
    }

    // 5. Reset Button
    const resetBtn = document.getElementById('btn-uni-reset') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.reset();
    });
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ') {
        this.togglePause();
      } else if (e.key === 'r' || e.key === 'R') {
        this.reset();
      }
    });
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.commandBus.dispatch('TOGGLE_PAUSE', { paused: this.isPaused }, 'UI');

    const icon = document.getElementById('uni-pause-icon');
    const text = document.getElementById('uni-pause-text');
    if (icon && text) {
      icon.innerText = this.isPaused ? '▶️' : '⏸️';
      text.innerText = this.isPaused ? 'Resume' : 'Pause';
    }

    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: this.isPaused ? '⏸️ Simulation Paused' : '▶️ Simulation Resumed',
        icon: this.isPaused ? '⏸️' : '▶️'
      },
      'UI'
    );
  }

  public setTimeScale(scale: number): void {
    this.commandBus.dispatch('SET_TIME_SCALE', { scale }, 'UI');
    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: `⚡ Time Scale: ${scale}x`,
        icon: '⚡'
      },
      'UI'
    );
  }

  public setPreset(preset: UniversePresetId): void {
    this.currentPreset = preset;
    this.commandBus.dispatch('SET_UNIVERSE_PRESET', { preset }, 'UI');
    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: `🌌 Loaded Preset: ${preset.replace(/_/g, ' ')}`,
        icon: '🌌'
      },
      'UI'
    );
  }

  public reset(): void {
    this.commandBus.dispatch('RESET_UNIVERSE', { preset: this.currentPreset }, 'UI');
    this.commandBus.dispatch(
      'SHOW_TOAST',
      {
        message: '🔄 Universe Simulation Reset',
        icon: '🔄'
      },
      'UI'
    );
  }
}
