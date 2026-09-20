# AETHERIA Physics Model & Black Hole Dynamics

This document details the mathematical, physical, and computational models powering the **UniverseEngine** in **AETHERIA**, with a focus on first-class **Black Holes**, orbital mechanics, event horizon matter absorption, relativistic accretion disks, and interactive gesture triggers.

---

## 1. Gravitational Field Model

To maintain 60 FPS interactive performance with thousands of particles without incurring the prohibitive $O(N^2)$ cost of full general relativistic simulations or dense N-body trees, AETHERIA implements a **softened multi-body potential with finite gravitational influence bounds**.

### 1.1 Softened Gravitational Acceleration

The gravitational acceleration $\mathbf{a}_{grav}$ exerted by a black hole of mass $M$ at position $\mathbf{x}_{BH}$ on a particle or celestial body at position $\mathbf{x}$ is defined as:

$$\mathbf{a}_{grav} = \frac{G \cdot M \cdot \gamma_{acc}}{(|\mathbf{r}|^2 + \epsilon^2)^{3/2}} \mathbf{r} \cdot \Phi(r)$$

Where:
- $\mathbf{r} = \mathbf{x}_{BH} - \mathbf{x}$ is the displacement vector.
- $r = |\mathbf{r}| = \sqrt{dx^2 + dy^2 + dz^2}$ is the Euclidean distance.
- $G$ is the universal gravitational coupling constant ($G = 1.0$).
- $\gamma_{acc}$ is the black hole's accretion strength parameter ($\gamma_{acc} \in [0.5, 5.0]$).
- $\epsilon = 0.5$ is the Plummer gravitational softening parameter preventing infinite unphysical acceleration singularities at $r \to 0$.
- $\Phi(r)$ is the smooth cubic boundary cutoff function.

### 1.2 Gravitational Influence Radius & Boundary Falloff

Each black hole possesses a finite **Gravitational Influence Radius** $R_{inf}$ (default $R_{inf} = 30.0\,\text{AU}$). Outside this radius ($r \ge R_{inf}$), particles are computationally decoupled from the black hole ($O(1)$ early rejection). 

To ensure continuous derivatives and prevent abrupt force jumps at the boundary, a smooth cubic Hermite falloff is applied:

$$\Phi(r) = \begin{cases} 
1 - 3\left(\frac{r}{R_{inf}}\right)^2 + 2\left(\frac{r}{R_{inf}}\right)^3 & \text{for } r < R_{inf} \\
0 & \text{for } r \ge R_{inf}
\end{cases}$$

---

## 2. Accretion Disk Swirl & Orbital Trajectories

Particles in proximity to a black hole experience a combination of radial gravitational inward pull and tangential orbital torque, generating stable swirling accretion spirals and Keplerian orbital trajectories.

### 2.1 Tangential Orbital Torque

Within the accretion zone ($r \le R_{acc} \cdot 2.2$, where $R_{acc} = 4.5 \cdot R_{BH}$), a tangential orbital acceleration $\mathbf{a}_{tangential}$ is injected perpendicular to the radial vector in the equatorial $XZ$-plane:

$$\hat{\mathbf{t}} = \left( -\frac{\Delta z}{r_{2D}}, 0, \frac{\Delta x}{r_{2D}} \right), \quad r_{2D} = \sqrt{\Delta x^2 + \Delta z^2}$$

$$\mathbf{a}_{tangential} = \hat{\mathbf{t}} \cdot \sqrt{\frac{G \cdot M}{\max(r, 0.4)}} \cdot 0.45 \cdot \gamma_{acc} \cdot \Phi(r)$$

This tangential velocity component naturally counteracts pure radial collapse, establishing self-organizing orbital disks and relativistic plasma vortexes around the singularity.

---

## 3. Event Horizon & Matter Absorption

### 3.1 Schwarzschild Event Horizon Radius

The visual and physical boundary of no return is governed by the event horizon radius $r_s$:

$$r_s = 1.2 \cdot R_{BH}$$

### 3.2 Absorption & Relativistic Recycling Mechanics

When any particle or celestial body breaches the event horizon ($r \le r_s$):
1. **Mass-Energy Transfer**:
   - The black hole's mass increases: $M_{BH} \leftarrow M_{BH} + \Delta m$ ($\Delta m = 0.002$ per particle, or $85\%$ of colliding celestial body mass).
   - The black hole's internal radiation energy increases: $E_{BH} \leftarrow E_{BH} + \Delta E$.
2. **Relativistic Emission & Boundary Recycling**:
   - Rather than allocating and destroying objects (which triggers garbage collection pauses in V8), absorbed particles are immediately recycled to the outer accretion boundary $R_{outer} \in [0.85 R_{acc}, 1.3 R_{acc}]$ with Keplerian orbital velocity:
     $$\mathbf{v}_{recycle} = \left(-\sin\theta, 0, \cos\theta\right) \cdot \sqrt{\frac{G \cdot M_{BH}}{R_{outer}}} \cdot \gamma_{acc}$$
   - Recycled particles are assigned high-temperature relativistic colors (ionized cyan `[0.2, 0.95, 1.0]` or ultra-hot gold `[1.0, 0.88, 0.35]`), visually demonstrating continuous matter infalling, heating, and relativistic accretion emission.

---

## 4. Visual Optics & Gravitational Distortion (Lensing)

While exact geodesic photon raymarching (Schwarzschild null geodesics) is computationally intensive for WebGL on standard GPUs, AETHERIA approximates gravitational distortion through multi-layered visual shaders:

1. **Singularity Event Horizon**: A pure light-absorbing `#000000` core sphere with `depthWrite: true`, creating an absolute black shadow silhouette.
2. **Einstein Ring / Lensing Halo**: A procedural radial distortion sprite with high-intensity chromatic aberration ($[white \to cyan \to gold \to crimson]$) encircling the event horizon to mimic photon path deflection.
3. **Multi-Planar Relativistic Accretion Rings**:
   - Equatorial primary ring with differential Doppler rotation.
   - Ultra-hot inner boundary ring ($T \approx 10^7\,\text{K}$).
   - Tilted Doppler warped ring simulating photon bending over the top and bottom of the event horizon.

---

## 5. Mathematical Feature Extraction for Gesture Trigger

To spawn black holes hands-free, the vision pipeline combines **FIST detection** with **Circular Trajectory Analysis**.

### 5.1 FIST Invariant Feature

The average finger curl $C_{avg}$ across all 5 digits is computed from joint angle cosines:

$$C_{avg} = \frac{1}{5} \sum_{i=1}^5 (1 - \text{extensionRatio}_i)$$

A hand is classified as a **FIST** when $C_{avg} > 0.68$ and extended finger count $\le 1$.

### 5.2 Circular Trajectory Sweeping

The centroid trajectory history $P = \{ \mathbf{p}_0, \mathbf{p}_1, \dots, \mathbf{p}_N \}$ over a sliding window ($N \ge 12$ frames) is analyzed for continuous angular sweep $\Theta_{sweep}$:

$$\theta_k = \text{atan2}(y_{k} - y_{k-1}, x_{k} - x_{k-1})$$

$$\Delta\theta_k = \text{wrapToPi}(\theta_k - \theta_{k-1})$$

$$\Theta_{sweep} = \sum_{k=1}^N \Delta\theta_k$$

When $|\Theta_{sweep}| \ge 1.5\pi$ ($270^\circ$) in a consistent rotational direction with $C_{avg} > 0.65$:
- **Gesture Triggered**: `SPAWN_BLACK_HOLE` is dispatched at the 3D mapped hand scene position:
  $$\mathbf{x}_{spawn} = \left( (1 - x_{palm} - 0.5) \cdot 10, -(y_{palm} - 0.5) \cdot 6, -z_{palm} \cdot 5 \right)$$
- Debounce cooldown of $1.8\,\text{s}$ prevents duplicate accidental spawning.

---

## 6. Computational Complexity & Optimization Summary

| Subsystem | Algorithm Complexity | Data Structure | Optimization |
| :--- | :--- | :--- | :--- |
| **Celestial Gravity** | $O(N_{bodies}^2)$ | Array of Objects ($N \le 30$) | Pairwise Newton-Euler |
| **Particle Accretion** | $O(N_{BH} \cdot N_{particles})$ | `Float32Array` (6,000 particles) | Influence radius early rejection, vectorized memory layouts |
| **Particle Absorption** | $O(N_{BH} \cdot N_{particles})$ | Continuous Buffer | In-place zero-allocation particle recycling |
| **Lensing & Accretion** | $O(1)$ GPU passes | Three.js BufferGeometry + Sprites | Additive blending, instanced draw range |
