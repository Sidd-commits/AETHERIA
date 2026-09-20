# AETHERIA 🌌 — Procedural Universe Simulation

> **Aetheria** is a deterministic, procedural 3D universe simulation engine powered by computer-vision hand tracking (MediaPipe Hands) and WebGL rendering (Three.js). Built with a decoupled **UniverseEngine**, 6 modular celestial physics systems, 11 semantic hand gestures, and real-time procedural preset generation.

---

## ✨ Features

- **Procedural Universe Engine:** Pure simulation kernel completely decoupled from WebGL rendering with a fixed-timestep deterministic loop ($\Delta t = 1/60\text{s}$).
- **6 Modular Simulation Systems:**
  - **`GravitySystem`:** Softened multi-body celestial gravity & Keplerian orbital velocities ($O(N_{bodies} \cdot N_{particles})$).
  - **`ParticleSystem`:** Cosmic dust fields, accretion disk swirling, clustering, and harmonic waves.
  - **`CollisionSystem`:** Momentum conservation, asteroid fragmentation impacts, and black hole event horizon consumption.
  - **`EnergySystem`:** Solar radiation flux, thermal decay, energy field harmonics, and relativistic jet discharge.
  - **`FormationSystem`:** Procedural generation for Solar Systems, Binary Stars, Black Holes, and Nebulae.
  - **`DestructionSystem`:** Supernova shockwave propagation, stellar collapse, and lifecycle pruning.
- **5 Procedural Presets:**
  - ☀️ **Solar System:** Central radiant star with 6 orbiting rocky & gas planets, moon systems, asteroid belt, and cosmic dust.
  - ✨ **Binary Stars & Nebula:** Two mutually orbiting stars inside an emissive volumetric gas cloud.
  - 🕳️ **Black Hole Accretion:** Supermassive singularity with high-speed relativistic accretion disk and captured planetary debris.
  - 🌌 **Chaos Galaxy:** Multi-cluster colliding stellar bodies with dynamic supernovae.
  - 🕸️ **Aetheria Lattice:** Classic 3,000 particle Fibonacci lattice with spring-damper dynamics (100% backward compatibility).
- **Simulation Time Controls:** Pause/Resume (`Spacebar`), Time-Scaling (`0.25x`, `0.5x`, `1x`, `2x`, `5x`), and Reset (`R`).
- **Semantic Gesture Recognition Engine:** 11 real-time hand gestures with scale-invariant mathematics, confidence scoring, and a real-time **Debug HUD** visualizer (`D` key).

---

## 🎮 Controls & Interaction Guide

| Control | Gesture | Keyboard / Mouse | Action |
| :--- | :--- | :--- | :--- |
| **Navigate & Pan** | 🖐️ `OPEN_PALM` | Mouse Drag | Pan and tilt the 3D celestial camera. |
| **Supernova Impulse** | 👌 `PINCH` & release | Click & hold / `Space` | Accumulates gravitational energy; release triggers supernova. |
| **Scale Universe** | 👐 `TWO_HAND` Expand/Contract | Mouse Scroll Wheel | Dynamically scales the universe radius. |
| **Vortex Spin** | 🌀 `CIRCULAR_MOTION` | — | Imparts orbital vortex spin into accretion disks and planets. |
| **Color Palettes** | 🔢 Extended Finger Count (0–5) | Keys `0`–`5` / Palette button | Shifts particle and nebula color palette. |
| **Time Controls** | — | `Space` / Speed HUD | Pause/Resume and change simulation speed ($0.25\times$ to $5\times$). |
| **Reset Universe** | — | `R` key / Reset HUD | Resets and re-seeds the active celestial preset. |
| **Debug Visualizer** | — | `D` key / Debug button | Opens 21-point skeleton projection & live telemetry HUD. |

---

## 🏛️ System Architecture

```
src/
├── universe/
│   ├── UniverseEngine.ts        # Master deterministic simulation loop & snapshot generator
│   └── systems/
│       ├── GravitySystem.ts     # Softened celestial gravity & Keplerian orbital speeds
│       ├── ParticleSystem.ts    # Accretion disks, dust clustering, harmonic waves
│       ├── CollisionSystem.ts   # Inelastic impacts, debris generation, event horizon absorption
│       ├── EnergySystem.ts      # Stellar radiation flux, thermal dissipation, field resonance
│       ├── FormationSystem.ts   # Procedural synthesis for 5 universe presets
│       └── DestructionSystem.ts # Supernova shockwaves, stellar collapse, garbage collection
├── rendering/
│   ├── UniverseRenderer.ts      # Decoupled visualizer (stars, planets, black holes, nebulae)
│   ├── SceneManager.ts          # Three.js Scene, Camera, WebGLRenderer, resize handling
│   └── RenderLoop.ts            # Fixed-timestep simulation tick + visual frame interpolation
├── gestures/
│   ├── GestureDetector.ts       # Landmark ingestion, history, lifecycle state machines
│   ├── GestureClassifier.ts     # Invariant feature extraction & semantic classification
│   ├── GestureSmoother.ts       # Adaptive EMA, trajectory buffer, temporal voting, debouncing
│   ├── GestureEventBus.ts       # Typed lifecycle event bus (START, UPDATE, END, TRIGGER)
│   └── GestureAdapter.ts        # Decoupled bridge to CommandBus
├── ui/
│   ├── UniverseControls.ts      # Time-scale, pause/resume, preset selector HUD
│   ├── DebugOverlay.ts          # Skeleton visualizer & telemetry HUD
│   └── UIManager.ts             # Master UI orchestrator
└── main.ts                      # Application bootstrap & dependency injection root
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run Vite dev server
npm run dev

# 3. Build for production
npm run build
npm run preview
```

Open **`http://localhost:3000`** in any modern WebGL-compatible browser.
