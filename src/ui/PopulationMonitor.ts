import { CommandBus } from '../core/CommandBus';
import { EcosystemStats } from '../types/universe';

/**
 * Population Monitor HUD Panel
 * Displays real-time ecological vital signs:
 * - Live Population count
 * - Births count
 * - Deaths count
 * - Average Energy with visual meter
 * - Average Age
 * - Population Growth rate (dP/dt)
 * - Ecosystem Composition (Matter / Energy / Organisms)
 * - Interactive Life Controls (Seed Life, Energy Bloom, Supernova, Reset)
 */
export class PopulationMonitor {
  private commandBus: CommandBus;
  private container: HTMLElement;
  private isVisible: boolean = true;
  private lastUpdate: number = 0;
  private updateIntervalMs: number = 80; // ~12 fps DOM update throttle to preserve 60fps render loop

  // Cached DOM elements
  private elPopCount!: HTMLElement;
  private elBirthCount!: HTMLElement;
  private elDeathCount!: HTMLElement;
  private elAvgEnergyVal!: HTMLElement;
  private elAvgEnergyBar!: HTMLElement;
  private elAvgAgeVal!: HTMLElement;
  private elGrowthVal!: HTMLElement;
  private elGrowthIndicator!: HTMLElement;
  private elBarMatter!: HTMLElement;
  private elBarEnergy!: HTMLElement;
  private elBarOrganism!: HTMLElement;
  private elTotalLivingBadge!: HTMLElement;

  constructor(commandBus: CommandBus = CommandBus.getInstance()) {
    this.commandBus = commandBus;
    this.container = document.createElement('div');
    this.container.id = 'population-monitor-panel';
    this.createUI();
    this.bindEvents();
    this.bindKeyboardShortcuts();
  }

  private createUI(): void {
    this.container.className = 'population-monitor-panel interactive';
    this.container.style.cssText = `
      position: absolute;
      top: 90px;
      right: 32px;
      width: 290px;
      background: rgba(10, 15, 26, 0.82);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 245, 160, 0.25);
      border-radius: 18px;
      padding: 16px;
      z-index: 45;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(0, 245, 160, 0.08);
      font-family: 'Outfit', sans-serif;
      color: #f0f4fc;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
      user-select: none;
    `;

    this.container.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px; filter: drop-shadow(0 0 8px #00f5a0);">🌿</span>
          <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff;">Population Monitor</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span id="pop-living-badge" style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: rgba(0, 245, 160, 0.15); color: #00f5a0; border: 1px solid rgba(0, 245, 160, 0.3);">0 ORGANISMS</span>
          <button id="btn-close-pop-monitor" style="background: transparent; border: none; color: #8a99ad; cursor: pointer; font-size: 14px; padding: 2px 4px; line-height: 1;" title="Hide Monitor (Press 'E')">✕</button>
        </div>
      </div>

      <!-- Vital Statistics Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
        <!-- Population -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 10px; color: #8a99ad; letter-spacing: 0.05em; text-transform: uppercase;">Population</div>
          <div id="pop-count" style="font-size: 20px; font-weight: 700; color: #00f5a0; font-family: 'Cinzel', serif;">0</div>
        </div>

        <!-- Growth Rate -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 10px; color: #8a99ad; letter-spacing: 0.05em; text-transform: uppercase;">Growth Rate</div>
          <div style="display: flex; align-items: baseline; gap: 4px;">
            <span id="pop-growth-indicator" style="font-size: 14px;">📈</span>
            <span id="pop-growth-val" style="font-size: 16px; font-weight: 700; color: #ffffff;">+0.0/s</span>
          </div>
        </div>

        <!-- Births -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 10px; color: #8a99ad; letter-spacing: 0.05em; text-transform: uppercase;">Total Births</div>
          <div id="pop-births" style="font-size: 16px; font-weight: 600; color: #00f2fe;">0</div>
        </div>

        <!-- Deaths -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 8px 10px;">
          <div style="font-size: 10px; color: #8a99ad; letter-spacing: 0.05em; text-transform: uppercase;">Total Deaths</div>
          <div id="pop-deaths" style="font-size: 16px; font-weight: 600; color: #ff5e62;">0</div>
        </div>
      </div>

      <!-- Vital Meters: Avg Energy & Avg Age -->
      <div style="margin-bottom: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 10px; padding: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; color: #8a99ad;">Average Energy</span>
          <span id="pop-avg-energy" style="font-size: 12px; font-weight: 600; color: #ffd200;">0.00 E</span>
        </div>
        <!-- Energy Progress Bar -->
        <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
          <div id="pop-energy-bar" style="width: 50%; height: 100%; background: linear-gradient(90deg, #ff5e62, #ffd200, #00f5a0); border-radius: 3px; transition: width 0.15s ease;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #8a99ad;">Average Age</span>
          <span id="pop-avg-age" style="font-size: 12px; font-weight: 600; color: #c4d7f2;">0.0 s</span>
        </div>
      </div>

      <!-- Ecosystem Composition Bar -->
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #8a99ad; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em;">
          <span>Ecosystem Composition</span>
          <span>Matter / Energy / Organisms</span>
        </div>
        <div style="width: 100%; height: 8px; border-radius: 4px; overflow: hidden; display: flex; background: rgba(255, 255, 255, 0.1);">
          <div id="bar-matter" style="width: 80%; background: #6b7c96; transition: width 0.2s;" title="Matter"></div>
          <div id="bar-energy" style="width: 15%; background: #ffd200; transition: width 0.2s;" title="Energy"></div>
          <div id="bar-organism" style="width: 5%; background: #00f5a0; transition: width 0.2s;" title="Organisms"></div>
        </div>
      </div>

      <!-- Interactive Ecosystem Controls -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
        <button id="btn-eco-seed" class="eco-btn" style="background: rgba(0, 245, 160, 0.15); border-color: rgba(0, 245, 160, 0.35); color: #00f5a0;" title="Seed 150 new Organisms">
          <span>🌱</span> Seed Life
        </button>
        <button id="btn-eco-energy" class="eco-btn" style="background: rgba(255, 210, 0, 0.15); border-color: rgba(255, 210, 0, 0.35); color: #ffd200;" title="Spawn radiant Energy Burst">
          <span>⚡</span> Energy Bloom
        </button>
        <button id="btn-eco-supernova" class="eco-btn" style="background: rgba(255, 94, 98, 0.15); border-color: rgba(255, 94, 98, 0.35); color: #ff5e62;" title="Supernova blast creates temporary high energy">
          <span>💥</span> Supernova
        </button>
        <button id="btn-eco-reset" class="eco-btn" style="background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); color: #c4d7f2;" title="Reset Ecosystem">
          <span>🔄</span> Reset Eco
        </button>
      </div>
    `;

    document.body.appendChild(this.container);

    // Style button classes
    const style = document.createElement('style');
    style.innerHTML = `
      .eco-btn {
        border: 1px solid;
        border-radius: 8px;
        padding: 6px 10px;
        font-family: 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .eco-btn:hover {
        transform: translateY(-1px);
        filter: brightness(1.25);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .eco-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    // Cache elements
    this.elPopCount = this.container.querySelector('#pop-count') as HTMLElement;
    this.elBirthCount = this.container.querySelector('#pop-births') as HTMLElement;
    this.elDeathCount = this.container.querySelector('#pop-deaths') as HTMLElement;
    this.elAvgEnergyVal = this.container.querySelector('#pop-avg-energy') as HTMLElement;
    this.elAvgEnergyBar = this.container.querySelector('#pop-energy-bar') as HTMLElement;
    this.elAvgAgeVal = this.container.querySelector('#pop-avg-age') as HTMLElement;
    this.elGrowthVal = this.container.querySelector('#pop-growth-val') as HTMLElement;
    this.elGrowthIndicator = this.container.querySelector('#pop-growth-indicator') as HTMLElement;
    this.elBarMatter = this.container.querySelector('#bar-matter') as HTMLElement;
    this.elBarEnergy = this.container.querySelector('#bar-energy') as HTMLElement;
    this.elBarOrganism = this.container.querySelector('#bar-organism') as HTMLElement;
    this.elTotalLivingBadge = this.container.querySelector('#pop-living-badge') as HTMLElement;
  }

  private bindEvents(): void {
    // Close / Minimize button
    const closeBtn = this.container.querySelector('#btn-close-pop-monitor');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggle();
      });
    }

    // Action buttons
    const seedBtn = this.container.querySelector('#btn-eco-seed');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        this.commandBus.dispatch('SEED_ORGANISMS', { count: 150 }, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '🌱 Seeded 150 Organisms into Ecosystem',
          icon: '🌱'
        }, 'UI');
      });
    }

    const energyBtn = this.container.querySelector('#btn-eco-energy');
    if (energyBtn) {
      energyBtn.addEventListener('click', () => {
        this.commandBus.dispatch('SPAWN_ENERGY_BURST', { count: 250 }, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '⚡ Radiant Energy Bloom Released',
          icon: '⚡'
        }, 'UI');
      });
    }

    const supernovaBtn = this.container.querySelector('#btn-eco-supernova');
    if (supernovaBtn) {
      supernovaBtn.addEventListener('click', () => {
        this.commandBus.dispatch('TRIGGER_SUPERNOVA', { power: 1.2 }, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '💥 Supernova Shockwave: Matter Ionized into Energy!',
          icon: '💥'
        }, 'UI');
      });
    }

    const resetBtn = this.container.querySelector('#btn-eco-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.commandBus.dispatch('RESET_ECOSYSTEM', undefined, 'UI');
        this.commandBus.dispatch('SHOW_TOAST', {
          message: '🔄 Ecosystem State Reset to Primordial Baseline',
          icon: '🔄'
        }, 'UI');
      });
    }
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'e' || e.key === 'E') {
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
      this.container.style.transform = 'translateX(320px)';
      this.container.style.opacity = '0';
      this.container.style.pointerEvents = 'none';
    }
    return this.isVisible;
  }

  public show(): void {
    if (!this.isVisible) this.toggle();
  }

  public hide(): void {
    if (this.isVisible) this.toggle();
  }

  /**
   * Update HUD with live ecosystem statistics
   */
  public update(stats?: EcosystemStats): void {
    if (!stats) return;

    const now = performance.now();
    if (now - this.lastUpdate < this.updateIntervalMs) {
      return;
    }
    this.lastUpdate = now;

    // Update Population
    this.elPopCount.textContent = stats.population.toLocaleString();
    this.elTotalLivingBadge.textContent = `${stats.population} ORGANISMS`;

    // Update Births and Deaths
    this.elBirthCount.textContent = `+${stats.births.toLocaleString()}`;
    this.elDeathCount.textContent = `-${stats.deaths.toLocaleString()}`;

    // Update Average Energy & meter
    this.elAvgEnergyVal.textContent = `${stats.averageEnergy.toFixed(2)} E`;
    const energyPercent = Math.min(100, Math.max(0, (stats.averageEnergy / 2.0) * 100));
    this.elAvgEnergyBar.style.width = `${energyPercent.toFixed(1)}%`;

    // Update Average Age
    this.elAvgAgeVal.textContent = `${stats.averageAge.toFixed(1)} s`;

    // Update Growth Rate
    const growth = stats.populationGrowth;
    const sign = growth > 0 ? '+' : '';
    this.elGrowthVal.textContent = `${sign}${growth.toFixed(1)}/s`;
    if (growth > 0.05) {
      this.elGrowthVal.style.color = '#00f5a0';
      this.elGrowthIndicator.textContent = '📈';
    } else if (growth < -0.05) {
      this.elGrowthVal.style.color = '#ff5e62';
      this.elGrowthIndicator.textContent = '📉';
    } else {
      this.elGrowthVal.style.color = '#ffffff';
      this.elGrowthIndicator.textContent = '⚖️';
    }

    // Update Composition Bar
    const total = Math.max(1, stats.matterCount + stats.energyCount + stats.population);
    const pctMatter = ((stats.matterCount / total) * 100).toFixed(1);
    const pctEnergy = ((stats.energyCount / total) * 100).toFixed(1);
    const pctOrganism = ((stats.population / total) * 100).toFixed(1);

    this.elBarMatter.style.width = `${pctMatter}%`;
    this.elBarEnergy.style.width = `${pctEnergy}%`;
    this.elBarOrganism.style.width = `${pctOrganism}%`;
  }
}
