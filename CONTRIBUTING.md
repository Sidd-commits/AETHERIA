# Contributing to AETHERIA

Thank you for your interest in contributing to **AETHERIA**! We welcome contributions from developers, researchers, and designers.

This project is built with strict TypeScript standards, zero-runtime GC physics loops, and modern testing practices. Please follow the guidelines below to ensure a smooth contribution process.

---

## 🚀 Quick Start & Development Workflow

### 1. Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker** (Optional, for containerized local development)

### 2. Fork & Setup

```bash
# Clone your fork
git clone https://github.com/<your-username>/AETHERIA.git
cd AETHERIA

# Install dependencies with frozen lockfile
npm ci

# Start local Vite development server
npm run dev
```

The application will be available at `http://localhost:3000/`.

---

## 🛠️ Code Quality Standards & Commands

All contributions must pass strict typechecking, linting, formatting, and unit tests before merging.

### Commands Overview:

```bash
# 1. Typecheck (Strict TypeScript compiler verification)
npm run typecheck

# 2. Linting (ESLint 9+ Flat Config)
npm run lint
npm run lint:fix

# 3. Code Formatting (Prettier)
npm run format:check
npm run format

# 4. Testing (Vitest Unit & Integration Test Suite)
npm run test
npm run test:run
npm run test:coverage

# 5. Production Bundling
npm run build
```

---

## 📐 Architecture & Engineering Guidelines

1. **Decoupled Simulation & Visualization**:
   - Never couple physics or ecosystem logic directly to Three.js scenes or `Object3D` instances.
   - Simulation state resides entirely within `UniverseEngine` and is passed as immutable typed snapshots or SIMD buffers to `UniverseRenderer`.

2. **Zero-Allocation Runtime Physics Loops**:
   - Avoid creating temporary vector objects (`{x, y, z}`), array slices, or lambda closures in per-frame tick functions (`fixedTick`, `update`).
   - Use pre-allocated typed arrays (`Float32Array`, `Int32Array`) and static object pools to prevent V8 Garbage Collection stutter.

3. **Spatial Partitioning**:
   - Particle-to-particle, entity-to-particle, or ecosystem neighbor searches must utilize `SpatialHashGrid` rather than quadratic $O(N^2)$ brute-force iteration.

4. **Structured Logging & Error Boundaries**:
   - Avoid generic `console.log`. Use `Logger.create('ModuleName')` for structured, leveled telemetry.
   - Wrap risky I/O or browser API calls with `ErrorBoundary.tryExecute()`.

---

## 🌿 Git & Pull Request Guidelines

1. **Branch Naming**:
   - `feat/your-feature-name` (e.g. `feat/spatial-octree`)
   - `fix/bug-description` (e.g. `fix/orbit-drift`)
   - `perf/optimization-name` (e.g. `perf/buffer-geometry-upload`)
   - `docs/documentation-update` (e.g. `docs/architecture-guide`)

2. **Conventional Commits**:
   - Follow standard commit messages: `feat(...)`, `fix(...)`, `perf(...)`, `refactor(...)`, `test(...)`, `docs(...)`.

3. **Pull Request Checklist**:
   - [ ] `npm run typecheck` passes with 0 errors.
   - [ ] `npm run lint` passes with 0 errors.
   - [ ] `npm run test:run` passes 100% of tests.
   - [ ] `npm run build` succeeds without bundle errors.
   - [ ] Added unit or integration tests for new features.

---

## 📜 License

By contributing to AETHERIA, you agree that your contributions will be licensed under the MIT License.
