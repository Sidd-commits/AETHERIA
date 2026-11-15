export type IntegratorMode = 'EULER' | 'VERLET';

export interface OrbitalElements {
  semiMajorAxis: number; // a (astronomical units / simulation units)
  eccentricity: number; // e (0 = circular, 0 < e < 1 = elliptical)
  orbitalPeriod: number; // T (seconds)
  periapsisDistance: number; // closest approach
  apoapsisDistance: number; // farthest distance
  escapeVelocity: number; // speed required to escape central gravity well
  currentSpeed: number; // current magnitude of velocity
  specificEnergy: number; // orbital mechanical energy per unit mass
}

export interface TrajectoryPath {
  entityId: string;
  color: string;
  pointCount: number;
  points: Float32Array; // Flattened x, y, z array (pointCount * 3)
  elements: OrbitalElements | null;
}

export interface SpacetimeGridData {
  resolution: number; // Grid dimension (e.g. 32x32)
  size: number; // Total physical extent (e.g. 50 units)
  vertices: Float32Array; // Flattened positions (resolution * resolution * 3)
  maxCurvatureDepth: number;
  centerMassCount: number;
}
