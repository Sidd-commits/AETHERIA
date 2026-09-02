/**
 * Mathematical utilities for 3D physics and geometry calculations
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function distance3D(
  p1: { x: number; y: number; z?: number },
  p2: { x: number; y: number; z?: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function distance2D(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Generates Fibonacci spherical distribution coordinates with organic noise
 */
export function generateFibonacciSphere(
  count: number,
  baseRadius: number
): { positions: Float32Array; sizes: Float32Array } {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;

    // Organic depth variation (0.92 to 1.08 radius)
    const radiusNoise = baseRadius * (0.92 + Math.random() * 0.16);
    const x = Math.cos(theta) * radiusAtY * radiusNoise;
    const z = Math.sin(theta) * radiusAtY * radiusNoise;
    const posY = y * radiusNoise;

    const i3 = i * 3;
    positions[i3] = x;
    positions[i3 + 1] = posY;
    positions[i3 + 2] = z;

    sizes[i] = 0.16 + Math.random() * 0.14;
  }

  return { positions, sizes };
}
