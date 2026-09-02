# AETHERIA 🌌

> **Aetheria** is an interactive, real-time 3D particle universe (3,000 particles) driven by computer-vision hand tracking (MediaPipe Hands) and WebGL rendering (Three.js). Refactored into a scalable, production-grade **TypeScript + Vite** architecture with a decoupled **Command/Event Bus** designed for multi-modal extensibility (Gestures, Mouse/Keyboard, and future Voice AI).

---

## ✨ Features

- **3D Particle Lattice:** 3,000 glowing particles distributed uniformly on a Fibonacci spherical lattice with additive blending and harmonic wave oscillations.
- **Sub-Millisecond Hand Tracking:** Real-time 21-landmark tracking powered by MediaPipe Hands with Picture-in-Picture skeletal visualization.
- **Supernova Physics Simulation:** Pure numeric spring-damper dynamics with pinch-to-charge energy accumulation and explosive radial burst reformation.
- **Dynamic Color Palettes:** Dynamic theme transitions based on extended finger count (0 to 5):
  - `0` Fist: **Void Ultraviolet**
  - `1` Index: **Cyber Cyan**
  - `2` Peace: **Sunset Magenta**
  - `3` Three: **Hyper Emerald**
  - `4` Four: **Solar Flare**
  - `5` Open Palm: **Prismatic Spectrum**
- **Decoupled Command Bus:** Centralized event bus enabling gestures, mouse/keyboard fallbacks, and future Voice AI to dispatch identical universe commands.
- **Zero-Allocation Physics Loop:** Zero heap allocations during frame ticks for smooth 60fps performance on typed `Float32Array` buffers.

---

## 🎮 Controls & Interactions

| Interaction | Hand Gesture | Mouse / Keyboard Fallback | Action |
| :--- | :--- | :--- | :--- |
| **Translate & Tilt** | 🖐️ Move & tilt single hand | Move mouse | Moves & rotates particle sphere in 3D space |
| **Pinch Charge** | 👌 Pinch thumb + index | Click & hold mouse button | Charges radial energy ring with vibrational jitter |
| **Supernova Release** | 💥 Release pinch after charge | Release mouse click | Triggers explosive radial burst with spring reformation |
| **Sphere Scale** | 👐 Spread / bring 2 hands together | Scroll mouse wheel | Dynamically scales sphere radius |
| **Theme Switching** | 🔢 Extended finger count (0–5) | Keys `0`–`5` / Palette button | Smoothly shifts particle color palette |
| **Webcam Backdrop** | — | `C` key / Webcam button | Toggles mirrored webcam feed as backdrop |
| **Instant Burst** | — | `Spacebar` / Burst button | Manually triggers 100% power supernova |

---

## 🏗️ Architecture & Component Separation

```
src/
├── main.ts                      # Application bootstrap & dependency injection root
├── config/
│   ├── constants.ts             # Physics, camera, gesture, and animation constants
│   └── palettes.ts              # Strongly typed color palettes (0-5)
├── types/
│   ├── particle.ts              # Particle & ParticleBuffer interfaces
│   ├── gesture.ts               # GestureType & Gesture interfaces
│   ├── hand.ts                  # HandLandmark, HandLandmarks, & HandState interfaces
│   ├── universe.ts              # UniverseState interface
│   ├── physics.ts               # PhysicsConfig interface
│   └── events.ts                # CommandType, UniverseCommand, CommandPayloadMap
├── core/
│   ├── CommandBus.ts            # Centralized typed event/command system (extensible for Voice AI)
│   └── WorldState.ts            # Reactive universe state store & command listener
├── physics/
│   └── PhysicsEngine.ts         # Pure buffer spring dynamics, damping, and supernova burst
├── simulation/
│   └── ParticleSimulator.ts     # Fibonacci lattice distribution, buffer allocation, color lerp
├── rendering/
│   ├── SceneManager.ts          # Three.js Scene, Camera, WebGLRenderer, resize handling
│   ├── ParticleRenderer.ts      # BufferGeometry, PointsMaterial, radial glow sprite generator
│   └── RenderLoop.ts            # requestAnimationFrame loop, delta time, scene interpolation
├── tracking/
│   └── HandTracker.ts           # MediaPipe Hands & Camera lifecycle, PiP skeleton renderer
├── gestures/
│   └── GestureRecognizer.ts     # Palm centroid, tilt Euler, pinch detection, finger counting
├── input/
│   └── InputManager.ts          # Mouse & Keyboard fallbacks with active tracking suppression
├── ui/
│   ├── UIManager.ts             # Master UI orchestrator
│   ├── HUDController.ts         # Top mode/theme pills, camera status dot
│   ├── ChargeRingController.ts  # SVG circular meter & percentage display
│   └── ToastController.ts       # Animated toast notification queue
├── utils/
│   ├── math.ts                  # Vector math, clamping, Fibonacci sphere math
│   └── dom.ts                   # Type-safe DOM selectors & helpers
└── styles/
    └── main.css                 # Glassmorphic dark UI, typography, HUD, SVG styles
```

---

## 🔌 Centralized Command Bus & Voice AI Readiness

All inputs (Hand Gestures, Mouse/Keyboard, UI Buttons, and future Voice AI systems) communicate with the simulation solely via the `CommandBus`:

```typescript
import { CommandBus } from './core/CommandBus';

const commandBus = CommandBus.getInstance();

// Future Voice AI example:
commandBus.dispatch('SET_PALETTE', { index: 2 }, 'VOICE_AI');
commandBus.dispatch('TRIGGER_EXPLOSION', { power: 1.0 }, 'VOICE_AI');
commandBus.dispatch('SET_TRANSFORM', { scale: 1.8 }, 'VOICE_AI');
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & npm

### Development
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build
```bash
# Typecheck and build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 📄 License
MIT License. Open-source and free for personal or commercial use.
