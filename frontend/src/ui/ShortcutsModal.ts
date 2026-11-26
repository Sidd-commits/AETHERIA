/**
 * Keyboard Shortcuts & Spatial Hand Gesture Quick-Reference Modal
 * Toggleable via '?' key or the top navigation Guide button.
 */
export class ShortcutsModal {
  private container: HTMLElement;
  private isVisible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'shortcuts-guide-modal';
    this.createDOM();
    this.bindEvents();
  }

  private createDOM(): void {
    this.container.className = 'world-gen-modal interactive';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="world-gen-backdrop" id="shortcuts-backdrop"></div>
      <div class="world-gen-dialog" style="width: 780px;">
        <div class="world-gen-header">
          <div class="world-gen-title-group">
            <div class="world-gen-logo">⌨️</div>
            <div>
              <h2 class="world-gen-title">Command, Timeline & Gesture Reference</h2>
              <div class="world-gen-subtitle">Quick reference for Simulation, ChronoWarp, Telemetry HUDs & MediaPipe Vision</div>
            </div>
          </div>
          <button id="shortcuts-close-btn" class="wg-close-btn" title="Close Guide (Esc or ?)">✕</button>
        </div>

        <div class="world-gen-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 14px;">
          <div class="wg-json-inspector" style="padding: 14px;">
            <div style="font-size: 12px; font-weight: 700; color: #00f2fe; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
              🪐 Physics & Simulation
            </div>
            <div class="shortcut-list">
              <div class="shortcut-row"><span>Play / Pause Simulation</span><kbd>Space</kbd> / <kbd>K</kbd></div>
              <div class="shortcut-row"><span>Trigger Supernova Shockwave</span><kbd>X</kbd></div>
              <div class="shortcut-row"><span>Spawn Black Hole at Cursor</span><kbd>B</kbd></div>
              <div class="shortcut-row"><span>Reset Active Universe</span><kbd>R</kbd></div>
              <div class="shortcut-row"><span>Toggle Orbital Trajectories</span><kbd>T</kbd></div>
              <div class="shortcut-row"><span>Toggle Spacetime Curvature Grid</span><kbd>G</kbd></div>
              <div class="shortcut-row"><span>Switch Verlet / Euler Integrator</span><kbd>O</kbd></div>
              <div class="shortcut-row"><span>Switch Cosmic Color Palettes</span><kbd>0</kbd> – <kbd>5</kbd></div>
            </div>
          </div>

          <div class="wg-json-inspector" style="padding: 14px;">
            <div style="font-size: 12px; font-weight: 700; color: #00f5a0; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
              ⏳ ChronoWarp & HUD Panels
            </div>
            <div class="shortcut-list">
              <div class="shortcut-row"><span>Step 1 Frame Back / Forward</span><kbd>[</kbd> / <kbd>]</kbd></div>
              <div class="shortcut-row"><span>Toggle Reverse Time Playback</span><kbd>\\</kbd> / <kbd>Bksp</kbd></div>
              <div class="shortcut-row"><span>Return to Live / Replay Event</span><kbd>L</kbd> / <kbd>J</kbd></div>
              <div class="shortcut-row"><span>ChronoWarp Scrubber Bar</span><kbd>H</kbd></div>
              <div class="shortcut-row"><span>World Gen / AETHER / Voice AI</span><kbd>W</kbd> / <kbd>A</kbd> / <kbd>V</kbd></div>
              <div class="shortcut-row"><span>Ecosystem / Inspector / Perf</span><kbd>E</kbd> / <kbd>I</kbd> / <kbd>P</kbd></div>
              <div class="shortcut-row"><span>Debug Overlay / Webcam Feed</span><kbd>D</kbd> / <kbd>C</kbd></div>
              <div class="shortcut-row"><span>Capture 3D Viewport PNG</span><kbd>S</kbd></div>
            </div>
          </div>

          <div class="wg-json-inspector" style="padding: 14px; grid-column: 1 / -1;">
            <div style="font-size: 12px; font-weight: 700; color: #fee140; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
              🖐️ MediaPipe Spatial Hand Gestures (or Mouse Fallback)
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 11.5px; color: #cbd5e1;">
              <div><strong style="color:#fff;">🖐️ Open Palm:</strong> Navigate 3D cosmos</div>
              <div><strong style="color:#fff;">👌 Pinch / Mouse Hold:</strong> Charge & release Supernova</div>
              <div><strong style="color:#fff;">✊ Fist + Circular Motion:</strong> Spawn Black Hole</div>
              <div><strong style="color:#fff;">☝️ / ✌️ / 🤟 1-3 Fingers:</strong> Switch color themes</div>
              <div><strong style="color:#fff;">👐 Dual Hand Spread:</strong> Expand / contract scale</div>
              <div><strong style="color:#fff;">🖱️ Mouse Wheel / Drag:</strong> Zoom & pan fallback</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.injectStyles();
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const styleId = 'shortcuts-modal-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .shortcut-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        font-size: 11.5px;
        color: #cbd5e1;
      }
      .shortcut-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .shortcut-row kbd {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(0, 242, 254, 0.3);
        border-radius: 5px;
        padding: 1px 6px;
        font-family: monospace;
        font-size: 10.5px;
        color: #00f2fe;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.container.querySelector('#shortcuts-close-btn')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#shortcuts-backdrop')?.addEventListener('click', () => this.hide());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'flex';
    document.getElementById('btn-toggle-shortcuts')?.classList.add('active-glow');
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
    document.getElementById('btn-toggle-shortcuts')?.classList.remove('active-glow');
  }

  public toggle(): boolean {
    if (this.isVisible) this.hide();
    else this.show();
    return this.isVisible;
  }
}
