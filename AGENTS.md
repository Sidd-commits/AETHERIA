# AETHERIA Engineering & Security Directives

This project adheres to the **Ponytail (Lazy Senior Dev)** principles for extreme performance and zero bloat, alongside **Cloudflare Security Audit** standards for rock-solid web resilience.

---

## 1. Ponytail: Lean & High-Performance Engineering

> _The best code is the code never written. Solve the whole problem with the least code, zero bloat, and maximum performance._

1. **YAGNI & Platform Primitives**:
   - Use native browser platform APIs (`requestAnimationFrame`, `TypedArray`, `CanvasRenderingContext2D`, `Web Speech API`) over heavy third-party abstractions.
   - Keep data structures flat and contiguous (`Float32Array`, `Uint8Array`) to maximize cache locality and enable SIMD optimizations.
2. **Zero-Allocation Runtime**:
   - In 60 FPS hot loops (physics simulation, particle updates, skeletal tracking, rendering), **never allocate objects, arrays, or closures**.
   - Reuse pre-allocated object pools, scratch vectors, and typed array views.
3. **Short, Maintainable, & Explicit**:
   - Favor deletion over addition. If two helpers do the same job, merge them.
   - One line a reader gets at a glance beats 50 lines of speculative design patterns.
   - Comment only the _why_ that code cannot show. Shortcuts get: `shortcut: <the limit>, <when to upgrade>`.
4. **Never Cut**:
   - Validation at trust boundaries, error boundaries preventing unhandled crashes, security sanitization, and deterministic test coverage.

---

## 2. Cloudflare Security Audit Standards

> _Defensive, source-first workflow enforcing strict trust boundaries and zero trust for external inputs._

1. **Trust Boundaries & Client-Side Hardening**:
   - Treat all user inputs (voice transcriptions, world generation prompts, URL parameters, external payloads) as untrusted.
   - **Zero DOM Injection**: Avoid raw `innerHTML` with dynamic interpolations. Use `textContent`, `innerText`, or structured element construction.
   - Enforce Content Security Policy (CSP), Strict-Transport-Security, X-Content-Type-Options, and Frame-Options in deployment server configurations (`nginx.conf`) and HTML headers.
2. **Sandboxed AI Execution**:
   - The AI layer is strictly an advisor, never an executor.
   - All AI-generated commands must pass through strict schema validation (`CommandValidator` & Zod schemas) before dispatch to `CommandBus`.
   - Never allow AI models to evaluate arbitrary JavaScript, access DOM roots directly, or bypass simulation parameter boundaries.
3. **Resource Exhaustion & DoS Prevention**:
   - Clamp all simulation parameters (particle counts: min 1,000, max 30,000; physics substeps, explosion radii, entity lifespans).
   - Throttle computer vision inference (~30 FPS) asynchronously to decouple vision bottlenecks from the 60 FPS WebGL render thread.
4. **Credential & Sensitive Data Hygiene**:
   - Zero hardcoded secrets, private keys, or tokens.
   - Optional API keys must be loaded strictly through validated environment schemas (`src/config/env.ts`) and never emitted into client-side logging or telemetry.
