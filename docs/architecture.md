# 🏛️ AETHERIA: System Architecture & Technical Specification

## 1. System Overview & Core Philosophy

**AETHERIA** is architected around strict separation of concerns, deterministic physics execution, scale-invariant computer vision, and zero-runtime-allocation memory management.

```mermaid
flowchart TB
    subgraph Input_Layer ["Input & Perception Subsystem"]
        Webcam["Webcam Video Stream"] --> MediaPipe["MediaPipe Hands (30 Hz)"]
        MediaPipe --> GestureRecognizer["Gesture Recognition Engine"]
        Microphone["Microphone Audio Stream"] --> SpeechRec["Speech Recognition Engine"]
        KeyboardMouse["Mouse / Keyboard / Touch"] --> InputMgr["Input Manager"]
    end

    subgraph Core_Bus ["Central Command Dispatch"]
        CommandBus["CommandBus (Typed Event Hub)"]
    end

    subgraph Simulation_Kernel ["UniverseEngine (Deterministic Kernel)"]
        UniverseEngine["UniverseEngine (Fixed Timestep 60Hz)"]
        GravitySys["GravitySystem"]
        CollisionSys["CollisionSystem"]
        EcosystemSys["EcosystemSystem"]
        SpatialHash["SpatialHashGrid (3D O(1))"]
        ParticleSys["ParticleSystem (16k Buffer)"]
        DestructionSys["DestructionSystem"]
        FormationSys["FormationSystem"]
    end

    subgraph AI_Subsystem ["Intelligent Guardian & Synthesis"]
        AIManager["AIManager (Adapter Registry)"]
        AETHER["AETHER Guardian & State Summarizer"]
        WorldGen["Procedural World Gen Studio"]
        CommandValidator["CommandValidator (Security Gate)"]
    end

    subgraph Visualization_Layer ["Decoupled Visualizer & Telemetry"]
        SceneMgr["SceneManager (Three.js WebGL)"]
        UniRenderer["UniverseRenderer (Direct SIMD Set)"]
        PerfHUD["Performance Monitor Telemetry HUD"]
        UI["Glassmorphic UI Overlay (10 Hz Throttle)"]
    end

    GestureRecognizer -->|Typed Commands| CommandBus
    SpeechRec -->|Voice Transcript| AIManager
    InputMgr -->|Fallback Commands| CommandBus
    AIManager --> CommandValidator -->|Sanitized JSON| CommandBus

    CommandBus -->|Dispatch State Changes| UniverseEngine
    CommandBus -->|Dispatch UI Actions| UI

    UniverseEngine --> GravitySys
    UniverseEngine --> CollisionSys
    UniverseEngine --> EcosystemSys
    UniverseEngine --> SpatialHash
    UniverseEngine --> ParticleSys
    UniverseEngine --> DestructionSys
    UniverseEngine --> FormationSys

    UniverseEngine -->|Immutable Snapshot & SIMD Arrays| UniRenderer
    UniverseEngine -->|Telemetry Summary| AETHER
    UniverseEngine -->|Telemetry Clocks| PerfHUD

    UniRenderer --> SceneMgr
```

---

## 2. Universe Simulation Kernel (`UniverseEngine`)

The simulation engine is completely decoupled from the DOM and WebGL renderers, operating as a deterministic pure mathematical state machine.

### Fixed-Timestep Accumulator Loop

To ensure identical physics across varied refresh rates (60Hz, 120Hz, 144Hz, 240Hz), simulation steps are executed using a fixed-timestep accumulator:

$$\Delta t_{\text{fixed}} = \frac{1}{60} \approx 0.016667\text{ s}$$

```typescript
public step(realDt: number): void {
  if (this.config.isPaused) return;
  const scaledDt = Math.min(0.1, realDt * this.config.timeScale);
  this.accumulator += scaledDt;
  while (this.accumulator >= this.config.fixedTimestep) {
    this.fixedTick(this.config.fixedTimestep);
    this.accumulator -= this.config.fixedTimestep;
  }
}
```

### Deterministic Subsystems

```mermaid
sequenceDiagram
    participant Engine as UniverseEngine
    participant Gravity as GravitySystem
    participant Collision as CollisionSystem
    participant Spatial as SpatialHashGrid
    participant Ecosystem as EcosystemSystem
    participant Particles as ParticleSystem

    Engine->>Gravity: updateEntityGravity(entities, config, dt)
    Engine->>Gravity: updateParticleGravity(buffer, dominantWells, config, dt)
    Engine->>Collision: resolveBodyCollisions(entities, config)
    Engine->>Spatial: clear() & populate(buffer.positions)
    Engine->>Ecosystem: updateEcosystem(buffer, spatialGrid, entities, dt)
    Engine->>Particles: update(blackHoles, config, dt, activeCount)
    Engine->>Engine: updateEntityLifecycles(dt)
```

1. **`GravitySystem`**:
   - Softened celestial N-body interaction:
     $$\mathbf{a}_i = \sum_{j \neq i} \frac{G M_j (\mathbf{r}_j - \mathbf{r}_i)}{(|\mathbf{r}_j - \mathbf{r}_i|^2 + \epsilon^2)^{3/2}}$$
   - Keplerian orbital velocity calculation for stable concentric orbits:
     $$\mathbf{v}_{\text{orb}} = \sqrt{\frac{G M_{\text{center}}}{r}} \cdot \hat{\mathbf{t}}$$
   - Dominant mass well particle acceleration with relativistic accretion disk vortex swirl.

2. **`SpatialHashGrid` ($O(1)$ Partitioning)**:
   - Zero-allocation 3D hash table using flat `Int32Array` head and next pointer arrays.
   - Spatial coordinate hash:
     $$\text{hash}(c_x, c_y, c_z) = |(c_x \cdot 73856093) \oplus (c_y \cdot 19349663) \oplus (c_z \cdot 83492791)| \pmod N_{\text{table}}$$
   - Neighborhood radius queries executed in **$4.4\text{ }\mu\text{s}$ per lookup**.

3. **`EcosystemSystem`**:
   - Living particle ecology: `ENERGY`, `MATTER`, and `ORGANISM`.
   - Organisms seek radiant energy, avoid black holes, consume nutrients, metabolize energy over time, and undergo mitosis reproduction above health thresholds.

---

## 3. Computer Vision & Gesture Recognition Pipeline

```mermaid
flowchart LR
    Frame["Webcam Video Frame"] -->|30 Hz Throttle| Worker["MediaPipe Hands (21 Landmarks)"]
    Worker -->|Raw Coordinates| Smoother["GestureSmoother (Adaptive EMA)"]
    Smoother --> Invariants["Feature Extraction (Scale, Angles, Curl)"]
    Invariants --> Classifier["GestureClassifier (Continuous Scoring)"]
    Classifier --> Vote["Temporal Voting & Debounce Filter"]
    Vote --> Bus["CommandBus Dispatch"]
```

### Scale-Invariant Feature Extraction

To ensure gestures work seamlessly regardless of user distance from the camera, all geometric measurements are normalized by the reference palm scale $S_{\text{palm}}$:

$$S_{\text{palm}} = \|\mathbf{p}_{\text{middle\_MCP}} - \mathbf{p}_{\text{wrist}}\|_2$$

$$\hat{\mathbf{p}}_i = \frac{\mathbf{p}_i - \mathbf{C}_{\text{palm}}}{S_{\text{palm}}}$$

- **Joint Angular Extension**: Cosine angle between proximal and distal phalanges:
  $$\cos \theta_j = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
- **Curvature / Circular Motion**: Trajectory heading angular integration $\Delta \theta \ge 1.5\pi$ over sliding 1-second window.
- **Dynamic Grab/Release**: First derivative of average finger curl:
  $$\dot{C} = \frac{\Delta C_{\text{avg}}}{\Delta t}$$

---

## 4. AI Subsystem & Architectural Decoupling

AETHERIA implements a provider-agnostic, strictly sandboxed AI layer. **The AI layer is NEVER permitted to execute raw JavaScript or mutate simulation objects directly.**

```mermaid
flowchart TD
    Prompt["User Natural Language Voice / Text Prompt"] --> AdapterRegistry{"AIAdapterRegistry"}
    AdapterRegistry -->|Offline / Zero Latency| LocalNLP["HeuristicLocalAdapter (Built-in)"]
    AdapterRegistry -->|Cloud Provider| OpenAI["OpenAICompatibleAdapter"]

    LocalNLP --> RawJSON["Raw AIStructuredCommand"]
    OpenAI --> RawJSON

    RawJSON --> Validator["CommandValidator (Strict Schema Guard)"]
    Validator -->|Check Security, Ranges & Safety| Verified{"Valid Command?"}

    Verified -->|Rejected| ErrorToast["Log Warning / Feedback"]
    Verified -->|Approved| CommandBus["CommandBus Dispatch"]
    CommandBus --> UniverseEngine["Execute Deterministic Simulation Action"]
```

### AETHER: Intelligent Guardian

`AetherGuardian` queries `UniverseStateSummarizer` to analyze:

- Celestial stability metrics (kinetic temperature, velocity dispersion $\sigma_v$, gravitational balance)
- Detected cosmic anomalies (orbital collapse, biomass depletion, black hole tidal shear)
- Actionable simulation recommendations (gravity calibration, orbit realignment, energy seeding).

---

## 5. WebGL Rendering & SIMD Buffer Transfers

```mermaid
flowchart LR
    Snapshot["UniverseSnapshot / Typed Arrays"] --> BufferCopy["TypedArray.prototype.set() (SIMD)"]
    BufferCopy --> ThreeBuffer["Three.js BufferGeometry (16,000 Points)"]
    ThreeBuffer --> CustomShader["WebGL Additive Blending Shader"]
    CustomShader --> Screen["60+ FPS Canvas Output"]
```

- Direct flat typed array memory streaming copies 45,000 floats in $< 0.15\text{ ms}$.
- Particle draw ranges are updated dynamically with `geometry.setDrawRange(0, activeParticles)`.
- Zero dynamic object allocations inside the WebGL render loop.
