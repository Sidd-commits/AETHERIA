import { CommandBus } from '../core/CommandBus';
import { UniverseSnapshot } from '../types/universe';
import { escapeHtml } from '../utils/dom';

/**
 * Celestial Inspector & Spacetime Telemetry HUD
 * Visualizes real-time Keplerian orbital elements, general-relativistic
 * spacetime curvature depth, and symplectic physics integrator state.
 */
export class CelestialInspectorHUD {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private contentEl: HTMLElement | null = null;
  private lastUpdate: number = 0;
  private selectedEntityId: string | null = null;

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;
    this.container = document.createElement('div');
    this.container.id = 'celestial-inspector-hud';
    this.createUI();
  }

  private createUI(): void {
    this.container.className = 'interactive glass-card';
    this.container.style.cssText = `
      position: absolute;
      top: 80px;
      right: 24px;
      width: 290px;
      background: rgba(12, 16, 26, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 242, 254, 0.25);
      border-radius: 16px;
      padding: 16px;
      z-index: 55;
      font-family: 'Outfit', sans-serif;
      color: #e2e8f0;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      display: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      transform: translateY(-8px);
    `;

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🌌</span>
          <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #00f2fe;">Celestial Dynamics</span>
        </div>
        <button id="btn-close-inspector" style="background: transparent; border: none; color: #8a99ad; cursor: pointer; font-size: 16px; line-height: 1;">✕</button>
      </div>

      <div id="inspector-content" style="font-size: 12px; line-height: 1.6;">
        <div style="color: #8a99ad; text-align: center; padding: 12px 0;">Awaiting celestial telemetry...</div>
      </div>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 6px;">
        <button id="btn-hud-toggle-orbits" style="
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.3);
          color: #00f2fe;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <span>💫 Orbital Trajectories</span>
          <span style="opacity: 0.7;">[Key T]</span>
        </button>

        <button id="btn-hud-toggle-grid" style="
          background: rgba(0, 245, 160, 0.12);
          border: 1px solid rgba(0, 245, 160, 0.3);
          color: #00f5a0;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <span>🌌 Spacetime Curvature Grid</span>
          <span style="opacity: 0.7;">[Key G]</span>
        </button>

        <button id="btn-hud-toggle-integrator" style="
          background: rgba(254, 225, 64, 0.12);
          border: 1px solid rgba(254, 225, 64, 0.3);
          color: #fee140;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <span id="label-hud-integrator">⚙️ Physics: Verlet</span>
          <span style="opacity: 0.7;">[Key O]</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.container);
    this.contentEl = this.container.querySelector('#inspector-content');

    const closeBtn = this.container.querySelector('#btn-close-inspector');
    closeBtn?.addEventListener('click', () => this.toggle(false));

    const orbitsBtn = this.container.querySelector('#btn-hud-toggle-orbits');
    orbitsBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_ORBITAL_TRAJECTORIES', undefined, 'UI');
    });

    const gridBtn = this.container.querySelector('#btn-hud-toggle-grid');
    gridBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('TOGGLE_SPACETIME_GRID', undefined, 'UI');
    });

    const integratorBtn = this.container.querySelector('#btn-hud-toggle-integrator');
    integratorBtn?.addEventListener('click', () => {
      this.commandBus.dispatch('SET_INTEGRATOR_MODE', undefined, 'UI');
    });

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'Escape' && this.isVisible) {
        this.toggle(false);
      }
    });
  }

  public toggle(force?: boolean): boolean {
    this.isVisible = force !== undefined ? force : !this.isVisible;
    document.getElementById('btn-toggle-inspector')?.classList.toggle('active-glow', this.isVisible);
    if (this.isVisible) {
      this.container.style.display = 'block';
      requestAnimationFrame(() => {
        this.container.style.opacity = '1';
        this.container.style.transform = 'translateY(0)';
      });
    } else {
      this.container.style.opacity = '0';
      this.container.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        if (!this.isVisible) this.container.style.display = 'none';
      }, 250);
    }
    return this.isVisible;
  }

  public update(snapshot: UniverseSnapshot): void {
    const now = performance.now();
    // Throttle DOM updates to 5Hz for high performance
    if (now - this.lastUpdate < 200 || !this.isVisible || !this.contentEl) return;
    this.lastUpdate = now;

    const trajectories = snapshot.trajectories || [];
    const grid = snapshot.spacetimeGrid;
    const mode = snapshot.integratorMode || 'VERLET';

    // Update integrator label
    const intLabel = this.container.querySelector('#label-hud-integrator');
    if (intLabel) {
      intLabel.textContent = `⚙️ Physics: ${mode === 'VERLET' ? 'Verlet (Precise)' : 'Euler (Fast)'}`;
    }

    const attractors = snapshot.entities.filter(
      (e) => !e.isDead && (e.type === 'STAR' || e.type === 'BLACK_HOLE')
    );

    let trajectoriesHtml = '';
    if (trajectories.length > 0) {
      if (!this.selectedEntityId || !trajectories.some((t) => t.entityId === this.selectedEntityId)) {
        this.selectedEntityId = trajectories[0].entityId;
      }

      const activeTraj =
        trajectories.find((t) => t.entityId === this.selectedEntityId) || trajectories[0];
      const entityName =
        snapshot.entities.find((e) => e.id === activeTraj.entityId)?.name ||
        `Body #${activeTraj.entityId.slice(-4)}`;

      const selectorPills = trajectories
        .slice(0, 6)
        .map((t) => {
          const isSelected = t.entityId === activeTraj.entityId;
          const shortName =
            snapshot.entities.find((e) => e.id === t.entityId)?.name?.split(' ')[0] ||
            `#${t.entityId.slice(-4)}`;
          return `<button class="inspector-body-tab" data-body-id="${escapeHtml(t.entityId)}" style="
            background: ${isSelected ? 'rgba(0, 242, 254, 0.22)' : 'rgba(255, 255, 255, 0.05)'};
            border: 1px solid ${isSelected ? 'rgba(0, 242, 254, 0.65)' : 'rgba(255, 255, 255, 0.1)'};
            color: ${isSelected ? '#ffffff' : '#94a3b8'};
            border-radius: 6px;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: ${isSelected ? '700' : '500'};
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          "><span style="width:6px;height:6px;border-radius:50%;background:${escapeHtml(t.color)};"></span>${escapeHtml(shortName)}</button>`;
        })
        .join('');

      const el = activeTraj.elements;
      trajectoriesHtml = el
        ? `
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; margin-bottom: 6px;">
            ${selectorPills}
          </div>
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: ${escapeHtml(activeTraj.color)}; margin-bottom: 4px;">
              <span>${escapeHtml(entityName)}</span>
              <span>${el.currentSpeed.toFixed(2)} u/s</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; color: #cbd5e1; font-size: 11px;">
              <span>a: <b>${el.semiMajorAxis.toFixed(2)}</b></span>
              <span>e: <b>${el.eccentricity.toFixed(3)}</b></span>
              <span>T: <b>${isFinite(el.orbitalPeriod) ? el.orbitalPeriod.toFixed(1) + 's' : '∞'}</b></span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; color: #8a99ad; font-size: 10px; margin-top: 4px;">
              <span>Hill: ${el.hillSphereRadius ? el.hillSphereRadius.toFixed(2) + 'u' : 'N/A'}</span>
              <span>Roche: ${el.rocheLimit ? el.rocheLimit.toFixed(2) + 'u' : 'N/A'}</span>
              <span>v_esc: ${el.escapeVelocity.toFixed(2)}</span>
            </div>
            ${
              activeTraj.lagrangePoints
                ? `
            <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.06); display: grid; grid-template-columns: 1fr 1fr; gap: 2px 6px; color: #38bdf8; font-size: 9.5px; font-family: monospace;">
              <span>L1: (${activeTraj.lagrangePoints.l1.x.toFixed(1)}, ${activeTraj.lagrangePoints.l1.z.toFixed(1)})</span>
              <span>L2: (${activeTraj.lagrangePoints.l2.x.toFixed(1)}, ${activeTraj.lagrangePoints.l2.z.toFixed(1)})</span>
              <span>L3: (${activeTraj.lagrangePoints.l3.x.toFixed(1)}, ${activeTraj.lagrangePoints.l3.z.toFixed(1)})</span>
              <span>L4: (${activeTraj.lagrangePoints.l4.x.toFixed(1)}, ${activeTraj.lagrangePoints.l4.z.toFixed(1)})</span>
              <span>L5: (${activeTraj.lagrangePoints.l5.x.toFixed(1)}, ${activeTraj.lagrangePoints.l5.z.toFixed(1)})</span>
            </div>`
                : ''
            }
          </div>
        `
        : '';
    } else {
      trajectoriesHtml = `<div style="color: #64748b; font-size: 11px; margin-top: 4px;">Trajectories hidden or no orbiting bodies</div>`;
    }

    this.contentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #8a99ad;">Integrator Mode:</span>
        <span style="font-weight: 600; color: #fee140;">${escapeHtml(mode)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #8a99ad;">Attractors:</span>
        <span style="font-weight: 600; color: #00f2fe;">${attractors.length} (${attractors.map((a) => a.type.replace('_', ' ')).join(', ') || 'None'})</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #8a99ad;">Spacetime Distortion:</span>
        <span style="font-weight: 600; color: #00f5a0;">${grid ? `-${grid.maxCurvatureDepth.toFixed(2)} depth` : 'Inactive'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #8a99ad;">Active Trajectories:</span>
        <span style="font-weight: 600; color: #c084fc;">${trajectories.length}</span>
      </div>

      <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 8px;">
        Orbital Keplerian Telemetry:
      </div>
      ${trajectoriesHtml}
    `;

    this.contentEl.querySelectorAll('.inspector-body-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.bodyId;
        if (id) {
          this.selectedEntityId = id;
          this.lastUpdate = 0; // Immediate refresh on body switch
          this.update(snapshot);
        }
      });
    });
  }
}
