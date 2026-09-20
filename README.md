# AETHERIA 🌌

> **Aetheria** is an interactive, real-time 3D particle universe (3,000 particles) driven by computer-vision hand tracking (MediaPipe Hands) and WebGL rendering (Three.js). Built with a modular, production-grade **TypeScript + Vite** architecture, a decoupled **Command/Event Bus**, and an invariant-based **Semantic Gesture Recognition Engine**.

---

## ✨ Features

- **3D Particle Lattice:** 3,000 glowing particles distributed uniformly on a Fibonacci spherical lattice with additive blending and harmonic wave oscillations.
- **Production Gesture Recognition Engine:** Low-level 21-point landmark extraction with scale-invariant mathematics, 3-joint extension angles, palm coordinate frames, and temporal smoothing.
- **11 Supported Semantic Gestures:** Continuous and discrete gestures with confidence scores $[0.0 - 1.0]$ and lifecycle states (`START`, `UPDATE`, `END`, `TRIGGER`).
- **Real-Time Debug Visualizer:** Canvas-projected skeleton joint overlay, live gesture classification badges, confidence meters, and FPS telemetry.
- **Supernova Physics Simulation:** Hooke's law spring dynamics with pinch-to-charge energy accumulation and explosive radial burst reformation.
- **Dynamic Color Palettes:** Dynamic theme transitions based on hand postures:
  - `0` Fist / Grab: **Void Ultraviolet**
  - `1` Point: **Cyber Cyan**
  - `2` Peace: **Sunset Magenta**
  - `3` Three Fingers: **Hyper Emerald**
  - `4` Four Fingers: **Solar Flare**
  - `5` Open Palm: **Prismatic Spectrum**
- **Decoupled Architecture:** `GestureDetector` $\rightarrow$ `GestureEventBus` $\rightarrow$ `GestureAdapter` $\rightarrow$ `CommandBus` $\rightarrow$ `WorldState` / `PhysicsEngine` (extensible to Voice AI & peripherals).

---

## 🎮 Supported Semantic Gestures

| Gesture | Type | Action & Visual Response |
| :--- | :--- | :--- |
| **🖐️ `OPEN_PALM`** | Continuous / Discrete | Translates & rotates 3D particle sphere; shifts to Spectrum palette (`5`). |
| **👌 `PINCH`** | Lifecycle (`START`/`UPDATE`/`END`) | Pinch thumb & index to fill radial charge ring; release triggers supernova explosion. |
| **✊ `FIST`** | Discrete | Curls all fingers into palm; shifts to Void Ultraviolet palette (`0`). |
| **☝️ `POINT`** | Continuous / Discrete | Extends index finger; provides precision steering & Cyber Cyan palette (`1`). |
| **✌️ `PEACE`** | Discrete | Extends index + middle in 'V' shape; shifts to Sunset Magenta palette (`2`). |
| **🤟 `THREE_FINGERS`** | Discrete | Extends index + middle + ring; shifts to Hyper Emerald palette (`3`). |
| **👐 `TWO_HAND_EXPAND`** | Continuous | Moves two hands apart; smoothly expands particle sphere radius. |
| **👐 `TWO_HAND_CONTRACT`** | Continuous | Brings two hands closer; smoothly contracts particle sphere radius. |
| **🌀 `CIRCULAR_MOTION`** | Continuous | Sweeps palm in circular trajectory ($>270^\circ$); imparts orbital vortex spin impulse. |
| **✊ `GRAB`** | Dynamic Discrete | Rapid finger flexion around palm centroid; anchors sphere in 3D space. |
| **💥 `RELEASE`** | Dynamic Discrete | Rapid extension from grab/pinch; triggers explosive particle burst. |

---

## 📐 Mathematical Feature Formulations

### 1. Scale Invariance & Palm Coordinate Frame
All Euclidean distances are normalized by the reference palm scale $S_{palm} = \|\mathbf{p}_9 - \mathbf{p}_0\|$ (distance from wrist $\mathbf{p}_0$ to middle MCP $\mathbf{p}_9$):
$$d_{norm}(i, j) = \frac{\|\mathbf{p}_i - \mathbf{p}_j\|}{S_{palm}}$$

- **Palm Centroid:** $\mathbf{C}_{palm} = \frac{1}{5}(\mathbf{p}_0 + \mathbf{p}_5 + \mathbf{p}_9 + \mathbf{p}_{13} + \mathbf{p}_{17})$
- **Palm Normal Vector:** $\mathbf{N}_{palm} = \frac{(\mathbf{p}_5 - \mathbf{p}_{17}) \times (\mathbf{p}_9 - \mathbf{p}_0)}{\|(\mathbf{p}_5 - \mathbf{p}_{17}) \times (\mathbf{p}_9 - \mathbf{p}_0)\|}$
- **Hand Orientation:** $\text{Pitch} = 2.5(\mathbf{p}_{9,y} - \mathbf{p}_{0,y})$, $\text{Yaw} = 3.0((1 - \mathbf{p}_{9,x}) - (1 - \mathbf{p}_{0,x}))$, $\text{Roll} = \text{atan2}(\mathbf{p}_{17,y} - \mathbf{p}_{5,y}, \mathbf{p}_{17,x} - \mathbf{p}_{5,x})$

### 2. Joint Angles & Finger Flexion Metric
For finger $F \in \{\text{Index, Middle, Ring, Pinky}\}$ with joints $(\text{MCP}, \text{PIP}, \text{DIP}, \text{TIP})$:
$$\mathbf{u} = \mathbf{p}_{PIP} - \mathbf{p}_{MCP}, \quad \mathbf{v} = \mathbf{p}_{TIP} - \mathbf{p}_{DIP}$$
$$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
- **Extension Metric:** Finger is extended when $\cos(\theta) > 0.45$ and $d_{norm}(\text{TIP}, \text{WRIST}) > d_{norm}(\text{PIP}, \text{WRIST}) \times 1.08$.

### 3. Pinch Metric
$$d_{pinch} = \frac{\|\mathbf{p}_4 - \mathbf{p}_8\|}{S_{palm}}, \quad C_{pinch} = \text{clamp}\left(1.0 - \frac{d_{pinch}}{0.38}, 0.0, 1.0\right)$$

### 4. Circular Trajectory & Angular Sweep
Heading angles $\phi_k = \text{atan2}(v_{y,k}, v_{x,k})$ over sliding trajectory history buffer:
$$\Delta \Phi = \sum_{k=1}^M \text{wrap}_{[-\pi, \pi]}(\phi_k - \phi_{k-1})$$
Recognized as `CIRCULAR_MOTION` when $|\Delta \Phi| \ge 1.5\pi$ ($270^\circ$).

### 5. Two-Hand Kinematics
Inter-hand distance $D_{hands} = \|\mathbf{C}_1 - \mathbf{C}_2\|$ and radial velocity $\dot{D}_{hands} = \frac{d D_{hands}}{dt}$:
- $\dot{D}_{hands} > 0.15\,\text{units/s} \rightarrow \text{TWO\_HAND\_EXPAND}$
- $\dot{D}_{hands} < -0.15\,\text{units/s} \rightarrow \text{TWO\_HAND\_CONTRACT}$

---

## 🏗️ Architecture Overview

```
src/
├── types/
│   ├── gesture.ts               # SemanticGestureType, Lifecycle, HandFeatures, Telemetry
│   ├── hand.ts                  # Raw & processed hand landmark interfaces
│   ├── events.ts                # CommandBus & UniverseCommand types
│   ├── universe.ts              # UniverseState interface
│   ├── physics.ts               # PhysicsConfig interface
│   └── particle.ts              # ParticleBuffer & Particle interfaces
├── gestures/
│   ├── GestureDetector.ts       # Pipeline orchestrator & lifecycle state machines
│   ├── GestureClassifier.ts     # Mathematical feature extraction & classification
│   ├── GestureSmoother.ts       # Landmark EMA filtering, history buffer, temporal voting
│   ├── GestureEventBus.ts       # Typed gesture lifecycle event emitter
│   └── GestureAdapter.ts        # Bridges GestureEventBus to CommandBus & WorldState
├── core/
│   ├── CommandBus.ts            # Centralized typed command dispatcher
│   └── WorldState.ts            # Reactive simulation state store
├── ui/
│   ├── DebugOverlay.ts          # Real-time skeleton canvas overlay & telemetry HUD
│   ├── UIManager.ts             # Master UI orchestrator
│   ├── HUDController.ts         # Top mode/theme pills, camera status dot
│   ├── ChargeRingController.ts  # SVG circular meter & percentage display
│   └── ToastController.ts       # Animated toast notifications
├── physics/
│   └── PhysicsEngine.ts         # Zero-allocation numerical spring-damper physics
├── simulation/
│   └── ParticleSimulator.ts     # Fibonacci lattice distribution & color lerp
├── rendering/
│   ├── SceneManager.ts          # Three.js Scene, Camera, WebGLRenderer
│   ├── ParticleRenderer.ts      # BufferGeometry, PointsMaterial, radial sprite
│   └── RenderLoop.ts            # 60fps animation frame loop
└── tracking/
    └── HandTracker.ts           # MediaPipe Hands & Camera stream manager
```

---

## 🛠️ Debug Mode

Press **`D`** or click the **Debug HUD** button in the footer to open the real-time visualizer:
- **Skeleton Visualizer:** Fullscreen canvas projection of 21 landmarks, color-coded joints, bone connections, and palm centroids.
- **Telemetry HUD:** Live FPS, inference latency (ms), tracking state badge, active gestures per hand with confidence percentage bars, and dual-hand span meters.

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
