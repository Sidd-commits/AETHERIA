import { describe, it, expect, beforeEach } from 'vitest';
import { HeuristicLocalAdapter } from '../../../src/ai/adapters/HeuristicLocalAdapter';
import { SimulationContext } from '../../../src/types/ai';

describe('AI Natural Language Command Parsing Unit Tests', () => {
  let adapter: HeuristicLocalAdapter;
  let mockContext: SimulationContext;

  beforeEach(() => {
    adapter = new HeuristicLocalAdapter();
    mockContext = {
      isPaused: false,
      timeScale: 1.0,
      activePreset: 'SOLAR_SYSTEM',
      dominantBodiesCount: 2,
      gravityConstant: 1.5,
      organismCount: 100,
      entities: []
    };
  });

  it('should parse "Create a planet" into CREATE_PLANET structured action', async () => {
    const result = await adapter.parseCommand('Create a giant gas planet', mockContext);

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('CREATE_PLANET');
    expect(result.command?.parameters.radius).toBeGreaterThan(0.35);
  });

  it('should parse "Create a black hole" into CREATE_BLACK_HOLE structured action', async () => {
    const result = await adapter.parseCommand(
      'Spawn a supermassive black hole at the center',
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('CREATE_BLACK_HOLE');
    expect(result.command?.parameters.mass).toBeGreaterThanOrEqual(200);
  });

  it('should parse "Make the universe blue" into SET_COLOR_PALETTE action', async () => {
    const result = await adapter.parseCommand('Make the universe blue', mockContext);

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('SET_COLOR_PALETTE');
    expect(result.command?.parameters.paletteIndex).toBeDefined();
  });

  it('should parse "Increase gravity" into ADJUST_GRAVITY action', async () => {
    const result = await adapter.parseCommand('Increase gravity', mockContext);

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('ADJUST_GRAVITY');
    expect(result.command?.parameters.multiplier).toBeGreaterThan(1.0);
  });

  it('should parse "Pause the simulation" and "Resume" into simulation state commands', async () => {
    const pauseResult = await adapter.parseCommand('Pause the simulation', mockContext);
    expect(pauseResult.success).toBe(true);
    expect(pauseResult.command?.action).toBe('PAUSE_SIMULATION');

    const resumeResult = await adapter.parseCommand('Resume simulation', mockContext);
    expect(resumeResult.success).toBe(true);
    expect(resumeResult.command?.action).toBe('RESUME_SIMULATION');
  });

  it('should parse "Make all planets orbit the center" into ALIGN_ORBITS action', async () => {
    const result = await adapter.parseCommand('Make all planets orbit the center', mockContext);

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('ALIGN_ORBITS');
    expect(result.command?.parameters.center).toBeDefined();
  });

  it('should parse "Create a supernova" into CREATE_SUPERNOVA action', async () => {
    const result = await adapter.parseCommand('Trigger a massive supernova explosion', mockContext);

    expect(result.success).toBe(true);
    expect(result.command?.action).toBe('CREATE_SUPERNOVA');
    expect(result.command?.parameters.power).toBeGreaterThan(1.0);
  });

  it('should parse ChronoWarp rewind and replay commands', async () => {
    const rewindRes = await adapter.parseCommand('Rewind the simulation', mockContext);
    expect(rewindRes.success).toBe(true);
    expect(rewindRes.command?.action).toBe('REWIND_TIMELINE');

    const replayRes = await adapter.parseCommand('Replay the last supernova', mockContext);
    expect(replayRes.success).toBe(true);
    expect(replayRes.command?.action).toBe('REPLAY_LAST_EVENT');

    const stepRes = await adapter.parseCommand('Step backward one frame', mockContext);
    expect(stepRes.success).toBe(true);
    expect(stepRes.command?.action).toBe('STEP_TIMELINE');
    expect(stepRes.command?.parameters.delta).toBe(-1);
  });

  it('should parse astrophysics toggles (spacetime grid and orbital trajectories)', async () => {
    const gridRes = await adapter.parseCommand('Show spacetime curvature grid', mockContext);
    expect(gridRes.success).toBe(true);
    expect(gridRes.command?.action).toBe('TOGGLE_SPACETIME_GRID');

    const orbitRes = await adapter.parseCommand('Show orbital trajectories', mockContext);
    expect(orbitRes.success).toBe(true);
    expect(orbitRes.command?.action).toBe('TOGGLE_ORBITAL_TRAJECTORIES');
  });

  it('should return helpful error response for unparseable input', async () => {
    const result = await adapter.parseCommand('Blah blah gibberish xyz123', mockContext);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Could not determine a recognized simulation action');
  });
});
