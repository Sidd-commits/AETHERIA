# AETHERIA 🌌

> An interactive 3D particle sphere (3,000 particles) controlled in real time by webcam hand gestures using Three.js and MediaPipe Hands. Built entirely as a zero-dependency, single-file web application.

---

## ✨ Features

- **3D Particle Lattice:** 3,000 glowing particles generated via Fibonacci spherical distribution with additive blending and harmonic idle waves.
- **Real-Time Hand Tracking:** Sub-millisecond hand tracking and 21-landmark gesture recognition powered by MediaPipe Hands.
- **Supernova Physics:** Pinch and hold to accumulate energy into an SVG charge ring, release to trigger an explosive radial burst that gravitationally reforms into a sphere.
- **Dynamic Color Palettes:** Extended finger count (0 to 5) dynamically shifts particle colors (Ultraviolet, Cyan, Magenta, Emerald, Solar, and Rainbow).
- **Fullscreen Webcam Backdrop:** Seamless toggle between a minimal dark void and an immersive mirrored webcam background.
- **Zero Dependencies / Build Tools:** Pure standalone `index.html` file—no `npm install`, Node.js, or bundlers required.

---

## 🎮 Hand Gestures & Controls

| Gesture | Action & Response |
| :--- | :--- |
| **🖐️ Single Hand Move** | Move and tilt hand to translate $(X,Y,Z)$ and rotate the particle sphere in 3D space. |
| **👌 Pinch & Hold** | Pinch thumb and index to fill the radial charge ring. |
| **💥 Pinch Release** | Release charge to trigger a radial particle explosion with gravitational spring reformation. |
| **👐 Two Hands** | Spread hands apart to expand sphere radius; bring together to shrink. |
| **🔢 Finger Count (0–5)** | Count extended fingers to smoothly switch color themes: <br>`0` Fist (Ultraviolet) · `1` Cyan · `2` Magenta · `3` Emerald · `4` Solar · `5` Rainbow |
| **🖱️ Mouse / Keyboard** | **Fallback:** Move mouse to rotate, click & hold to charge explosion, scroll to scale, keys `0-5` for colors, `C` for webcam toggle. |

---

## 🛠️ Tech Stack

- **Graphics:** [Three.js](https://threejs.org/) (WebGL Points & BufferGeometry)
- **Computer Vision:** [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- **Styling:** Vanilla CSS3 (Glassmorphism, CSS Blend Modes)
- **Typography:** Cinzel & Outfit (Google Fonts)

---

## 🚀 Quick Start

Due to browser webcam security policies (`getUserMedia`), the project must be served over `localhost` or HTTPS.

```bash
# Option 1: Python
python -m http.server 8080

# Option 2: Node / npx
npx serve .
```

Open **`http://localhost:8080/index.html`** in any modern WebGL-compatible browser (Chrome, Edge, Brave, Safari, Firefox).

---

## ⚙️ Configuration

Tune physics and particle parameters directly in `index.html`:

```javascript
const NUM_PARTICLES   = 3000;  // Number of particles (1000 - 10000)
const SPHERE_RADIUS   = 3.2;   // Base resting radius
const EXPLOSION_FORCE = 1.8;   // Impulse magnitude on pinch release
const SPRING_STRENGTH = 0.045; // Gravitational return speed
const DAMPING         = 0.88;  // Particle velocity decay rate
```

---

## 📄 License

MIT License. Open-source and free for personal or commercial use.
