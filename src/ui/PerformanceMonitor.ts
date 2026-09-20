import { QualityScaler, QualityPreset } from '../core/QualityScaler';

export interface PerformanceTelemetry {
  fps: number;
  frameTimeMs: number;
  physicsTimeMs: number;
  visionTimeMs: number;
  renderTimeMs: number;
  activeParticles: number;
  maxParticles: number;
  memoryUsageMb: number | null;
}

/**
 * Performance Monitor & Quality Telemetry HUD
 * Real-time diagnostic telemetry HUD with zero-allocation sparkline and adaptive quality switcher.
 */
export class PerformanceMonitor {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private qualityScaler: QualityScaler;

  // DOM Elements
  private fpsValEl!: HTMLElement;
  private fpsStatusEl!: HTMLElement;
  private frameTimeValEl!: HTMLElement;
  private particleCountValEl!: HTMLElement;
  private physicsTimeValEl!: HTMLElement;
  private visionTimeValEl!: HTMLElement;
  private renderTimeValEl!: HTMLElement;
  private memoryValEl!: HTMLElement;
  private qualityBadgeEl!: HTMLElement;
  private presetButtons: HTMLButtonElement[] = [];

  // Sparkline Canvas
  private sparklineCanvas!: HTMLCanvasElement;
  private sparklineCtx!: CanvasRenderingContext2D;
  private historyBuffer: Float32Array;
  private historyIndex: number = 0;
  private readonly historyCapacity = 60;

  // Throttled DOM updates (10 Hz)
  private lastDomUpdate: number = 0;
  private readonly domUpdateIntervalMs = 100;

  constructor(qualityScaler: QualityScaler) {
    this.qualityScaler = qualityScaler;
    this.historyBuffer = new Float32Array(this.historyCapacity);

    this.container = this.createDOM();
    document.body.appendChild(this.container);

    this.bindEvents();
  }

  private createDOM(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'perf-monitor-hud';
    root.className = 'perf-hud-panel interactive';
    root.style.display = 'none';

    root.innerHTML = `
      <div class="perf-hud-header">
        <div class="perf-hud-title">
          <span class="perf-hud-icon">⚡</span>
          <span>Performance & Telemetry HUD</span>
        </div>
        <button id="perf-close-btn" class="perf-close-btn" title="Close (Press P)">✕</button>
      </div>

      <!-- Main Gauges Grid -->
      <div class="perf-hud-grid">
        <!-- FPS -->
        <div class="perf-metric-box">
          <div class="perf-box-top">
            <span class="perf-box-label">FRAMES / SEC</span>
            <span id="perf-fps-status" class="perf-tag green">60 FPS</span>
          </div>
          <div class="perf-box-val-row">
            <span id="perf-fps-val" class="perf-box-val">60.0</span>
            <span class="perf-box-unit">FPS</span>
          </div>
        </div>

        <!-- Frame Time -->
        <div class="perf-metric-box">
          <div class="perf-box-top">
            <span class="perf-box-label">FRAME TIME</span>
            <span class="perf-tag blue">&lt; 16.6 ms</span>
          </div>
          <div class="perf-box-val-row">
            <span id="perf-frametime-val" class="perf-box-val">16.4</span>
            <span class="perf-box-unit">ms</span>
          </div>
        </div>

        <!-- Active Particles -->
        <div class="perf-metric-box">
          <div class="perf-box-top">
            <span class="perf-box-label">PARTICLE DENSITY</span>
            <span id="perf-quality-badge" class="perf-tag cyan">HIGH (10K)</span>
          </div>
          <div class="perf-box-val-row">
            <span id="perf-particles-val" class="perf-box-val">10,000</span>
            <span class="perf-box-unit">pts</span>
          </div>
        </div>

        <!-- Memory Heap -->
        <div class="perf-metric-box">
          <div class="perf-box-top">
            <span class="perf-box-label">JS HEAP MEMORY</span>
            <span class="perf-tag purple">GC HEALTHY</span>
          </div>
          <div class="perf-box-val-row">
            <span id="perf-memory-val" class="perf-box-val">--</span>
            <span class="perf-box-unit">MB</span>
          </div>
        </div>
      </div>

      <!-- Subsystem Timing Breakdown -->
      <div class="perf-breakdown-card">
        <div class="perf-breakdown-title">Subsystem Frame Latency Breakdown</div>
        <div class="perf-timing-row">
          <span class="perf-timing-name">🪐 Physics Kernel (60Hz):</span>
          <span id="perf-physics-val" class="perf-timing-val">1.2 ms</span>
        </div>
        <div class="perf-timing-row">
          <span class="perf-timing-name">👁️ Vision Tracking (30Hz):</span>
          <span id="perf-vision-val" class="perf-timing-val">4.5 ms</span>
        </div>
        <div class="perf-timing-row">
          <span class="perf-timing-name">🎨 Three.js GPU Render:</span>
          <span id="perf-render-val" class="perf-timing-val">2.8 ms</span>
        </div>
      </div>

      <!-- Sparkline Graph -->
      <div class="perf-sparkline-wrap">
        <div class="perf-sparkline-label">Frametime History (Last 60 Frames)</div>
        <canvas id="perf-sparkline-canvas" width="340" height="48"></canvas>
      </div>

      <!-- Dynamic Quality Scaling Controls -->
      <div class="perf-quality-controls">
        <div class="perf-quality-label">⚡ Adaptive Dynamic Quality Presets:</div>
        <div class="perf-preset-buttons">
          <button class="perf-preset-btn active" data-preset="AUTO">Auto</button>
          <button class="perf-preset-btn" data-preset="ULTRA">Ultra 15k</button>
          <button class="perf-preset-btn" data-preset="HIGH">High 10k</button>
          <button class="perf-preset-btn" data-preset="MEDIUM">Med 6.5k</button>
          <button class="perf-preset-btn" data-preset="LOW">Low 3.5k</button>
        </div>
      </div>
    `;

    this.injectStyles();
    return root;
  }

  private injectStyles(): void {
    const styleId = 'perf-hud-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .perf-hud-panel {
        position: fixed;
        top: 60px;
        right: 20px;
        width: 380px;
        max-width: 90vw;
        background: rgba(8, 14, 28, 0.92);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(0, 242, 254, 0.28);
        border-radius: 14px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(0, 242, 254, 0.1);
        z-index: 1000;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #e2e8f0;
        padding: 16px;
        animation: perfFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes perfFadeIn {
        from { opacity: 0; transform: translateY(-8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .perf-hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .perf-hud-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        background: linear-gradient(90deg, #00f2fe, #fff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .perf-hud-icon {
        font-size: 16px;
        -webkit-text-fill-color: initial;
      }
      .perf-close-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        width: 24px;
        height: 24px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
      }
      .perf-close-btn:hover {
        background: rgba(255, 88, 88, 0.2);
        color: #fff;
      }
      .perf-hud-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 12px;
      }
      .perf-metric-box {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px 10px;
      }
      .perf-box-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .perf-box-label {
        font-size: 0.65rem;
        font-weight: 700;
        color: #94a3b8;
      }
      .perf-tag {
        font-size: 0.62rem;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
      }
      .perf-tag.green { background: rgba(0, 245, 160, 0.15); color: #00f5a0; }
      .perf-tag.yellow { background: rgba(254, 225, 64, 0.15); color: #fee140; }
      .perf-tag.red { background: rgba(255, 88, 88, 0.15); color: #ff5858; }
      .perf-tag.blue { background: rgba(79, 172, 254, 0.15); color: #4facfe; }
      .perf-tag.cyan { background: rgba(0, 242, 254, 0.15); color: #00f2fe; }
      .perf-tag.purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }

      .perf-box-val-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .perf-box-val {
        font-size: 1.15rem;
        font-weight: 800;
        color: #f8fafc;
        font-family: 'Fira Code', monospace;
      }
      .perf-box-unit {
        font-size: 0.7rem;
        color: #64748b;
      }

      /* Breakdown Card */
      .perf-breakdown-card {
        background: rgba(10, 16, 30, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 12px;
      }
      .perf-breakdown-title {
        font-size: 0.7rem;
        font-weight: 700;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .perf-timing-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.74rem;
        margin-bottom: 3px;
      }
      .perf-timing-name {
        color: #cbd5e1;
      }
      .perf-timing-val {
        font-family: 'Fira Code', monospace;
        font-weight: 600;
        color: #00f2fe;
      }

      /* Sparkline */
      .perf-sparkline-wrap {
        margin-bottom: 12px;
      }
      .perf-sparkline-label {
        font-size: 0.68rem;
        color: #94a3b8;
        margin-bottom: 4px;
      }
      #perf-sparkline-canvas {
        width: 100%;
        height: 44px;
        background: rgba(4, 7, 18, 0.8);
        border: 1px solid rgba(0, 242, 254, 0.15);
        border-radius: 6px;
        display: block;
      }

      /* Preset Buttons */
      .perf-quality-controls {
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .perf-quality-label {
        font-size: 0.7rem;
        font-weight: 600;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .perf-preset-buttons {
        display: flex;
        gap: 5px;
      }
      .perf-preset-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        font-size: 0.68rem;
        font-weight: 600;
        padding: 5px 2px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .perf-preset-btn:hover {
        background: rgba(0, 242, 254, 0.15);
        color: #00f2fe;
      }
      .perf-preset-btn.active {
        background: #00f2fe;
        color: #061021;
        border-color: #00f2fe;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.fpsValEl = this.container.querySelector('#perf-fps-val') as HTMLElement;
    this.fpsStatusEl = this.container.querySelector('#perf-fps-status') as HTMLElement;
    this.frameTimeValEl = this.container.querySelector('#perf-frametime-val') as HTMLElement;
    this.particleCountValEl = this.container.querySelector('#perf-particles-val') as HTMLElement;
    this.physicsTimeValEl = this.container.querySelector('#perf-physics-val') as HTMLElement;
    this.visionTimeValEl = this.container.querySelector('#perf-vision-val') as HTMLElement;
    this.renderTimeValEl = this.container.querySelector('#perf-render-val') as HTMLElement;
    this.memoryValEl = this.container.querySelector('#perf-memory-val') as HTMLElement;
    this.qualityBadgeEl = this.container.querySelector('#perf-quality-badge') as HTMLElement;

    this.sparklineCanvas = this.container.querySelector('#perf-sparkline-canvas') as HTMLCanvasElement;
    this.sparklineCtx = this.sparklineCanvas.getContext('2d')!;

    this.container.querySelector('#perf-close-btn')?.addEventListener('click', () => this.hide());

    // Quality preset buttons
    this.presetButtons = Array.from(this.container.querySelectorAll('.perf-preset-btn')) as HTMLButtonElement[];
    this.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset') as QualityPreset;
        if (preset) {
          this.qualityScaler.setMode(preset);
          this.updatePresetButtons(preset);
        }
      });
    });

    // Keyboard shortcut 'P'
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'p' || e.key === 'P') && !this.isTypingInInput(e)) {
        this.toggle();
      }
    });
  }

  private isTypingInInput(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement | null;
    return !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'));
  }

  private updatePresetButtons(activePreset: QualityPreset): void {
    this.presetButtons.forEach((btn) => {
      const p = btn.getAttribute('data-preset');
      btn.classList.toggle('active', p === activePreset);
    });
  }

  /**
   * Update telemetry and throttled DOM rendering
   */
  public update(telemetry: PerformanceTelemetry): void {
    // Record into sparkline buffer
    this.historyBuffer[this.historyIndex] = telemetry.frameTimeMs;
    this.historyIndex = (this.historyIndex + 1) % this.historyCapacity;

    if (!this.isVisible) return;

    const now = performance.now();
    if (now - this.lastDomUpdate < this.domUpdateIntervalMs) {
      return;
    }
    this.lastDomUpdate = now;

    // Fast textContent assignments
    const fps = telemetry.fps;
    this.fpsValEl.textContent = fps.toFixed(1);

    if (fps >= 55) {
      this.fpsStatusEl.textContent = 'SMOOTH 60 FPS';
      this.fpsStatusEl.className = 'perf-tag green';
    } else if (fps >= 40) {
      this.fpsStatusEl.textContent = 'STABLE';
      this.fpsStatusEl.className = 'perf-tag yellow';
    } else {
      this.fpsStatusEl.textContent = 'DROPPED';
      this.fpsStatusEl.className = 'perf-tag red';
    }

    this.frameTimeValEl.textContent = telemetry.frameTimeMs.toFixed(1);
    this.particleCountValEl.textContent = telemetry.activeParticles.toLocaleString();
    this.physicsTimeValEl.textContent = `${telemetry.physicsTimeMs.toFixed(1)} ms`;
    this.visionTimeValEl.textContent = `${telemetry.visionTimeMs.toFixed(1)} ms`;
    this.renderTimeValEl.textContent = `${telemetry.renderTimeMs.toFixed(1)} ms`;

    if (telemetry.memoryUsageMb !== null) {
      this.memoryValEl.textContent = telemetry.memoryUsageMb.toFixed(0);
    } else {
      this.memoryValEl.textContent = 'N/A';
    }

    const mode = this.qualityScaler.getMode();
    const tier = this.qualityScaler.getCurrentTier();
    this.qualityBadgeEl.textContent = mode === 'AUTO' ? `AUTO (${tier})` : tier;

    this.drawSparkline();
  }

  private drawSparkline(): void {
    const ctx = this.sparklineCtx;
    const w = this.sparklineCanvas.width;
    const h = this.sparklineCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // 16.6ms Target line (60 FPS)
    const targetY = h - (16.6 / 40.0) * h;
    ctx.strokeStyle = 'rgba(0, 245, 160, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(w, targetY);
    ctx.stroke();

    // Frametime curve
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < this.historyCapacity; i++) {
      const idx = (this.historyIndex + i) % this.historyCapacity;
      const val = this.historyBuffer[idx];
      const x = (i / (this.historyCapacity - 1)) * w;
      const y = h - Math.min(1.0, val / 40.0) * (h - 4);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public toggle(): boolean {
    if (this.isVisible) this.hide();
    else this.show();
    return this.isVisible;
  }
}
