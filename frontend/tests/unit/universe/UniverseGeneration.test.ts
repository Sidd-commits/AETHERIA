import { describe, it, expect, beforeEach } from 'vitest';
import { WorldGenValidator } from '../../../src/universe/generator/WorldGenValidator';
import { UniverseConfigParser } from '../../../src/universe/generator/UniverseConfigParser';
import { ProceduralUniverseGenerator } from '../../../src/universe/generator/ProceduralUniverseGenerator';
import { ParticleSystem } from '../../../src/universe/systems/ParticleSystem';
import { EcosystemSystem } from '../../../src/universe/systems/EcosystemSystem';
import { UniverseConfiguration } from '../../../src/types/worldGen';

describe('Universe Generation & WorldGenValidator Unit Tests', () => {
  let particleSystem: ParticleSystem;
  let ecosystemSystem: EcosystemSystem;

  beforeEach(() => {
    particleSystem = new ParticleSystem(2000);
    particleSystem.setActiveCount(2000);
    ecosystemSystem = new EcosystemSystem();
  });

  describe('WorldGenValidator Schema & Security', () => {
    it('should sanitize valid universe configurations within safe numerical bounds', () => {
      const raw = {
        theme: 'peaceful',
        colorPalette: 'blue',
        stars: 3,
        blackHoles: 1,
        planets: 6,
        gravity: 1.4,
        energyDensity: 0.8,
        formationRate: 0.3
      };

      const result = WorldGenValidator.validate(raw);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig.stars).toBe(3);
      expect(result.sanitizedConfig.blackHoles).toBe(1);
      expect(result.sanitizedConfig.gravity).toBe(1.4);
      expect(result.securityVerified).toBe(true);
    });

    it('should clamp excessive stars and black holes to prevent simulation freeze', () => {
      const excessive = {
        theme: 'chaotic',
        colorPalette: 'fire',
        stars: 9999, // Should clamp to max (12)
        blackHoles: 50, // Should clamp to max (5)
        gravity: 100.0 // Should clamp to max (5.0)
      };

      const result = WorldGenValidator.validate(excessive);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedConfig.stars).toBeLessThanOrEqual(12);
      expect(result.sanitizedConfig.blackHoles).toBeLessThanOrEqual(5);
      expect(result.sanitizedConfig.gravity).toBeLessThanOrEqual(5.0);
    });

    it('should reject dangerous prototypes or executable function injections', () => {
      const malicious = {
        theme: 'hack',
        stars: 1,
        evilPayload: () => true
      };

      const result = WorldGenValidator.validate(malicious);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('executable code'))).toBe(true);
    });
  });

  describe('UniverseConfigParser Natural Language Parsing', () => {
    it('should extract structured parameters from natural language prompts', async () => {
      const parser = UniverseConfigParser.getInstance();
      const prompt =
        'A peaceful blue universe with three suns and a giant black hole in the center.';
      const res = await parser.parseDescription(prompt);

      expect(res.isValid).toBe(true);
      expect(res.sanitizedConfig.theme).toBe('peaceful');
      expect(res.sanitizedConfig.stars).toBe(3);
      expect(res.sanitizedConfig.blackHoles).toBe(1);
    });

    it('should parse chaotic universe descriptions with high gravity', async () => {
      const parser = UniverseConfigParser.getInstance();
      const prompt = 'Create a chaotic universe with high gravity and rapid star formation.';
      const res = await parser.parseDescription(prompt);

      expect(res.isValid).toBe(true);
      expect(res.sanitizedConfig.theme).toBe('chaotic');
      expect(res.sanitizedConfig.gravity).toBeGreaterThan(1.0);
    });
  });

  describe('ProceduralUniverseGenerator Procedural Construction', () => {
    it('should construct celestial entities and particle distributions deterministically', () => {
      const config: UniverseConfiguration = {
        theme: 'binary',
        colorPalette: 'cyan',
        stars: 2,
        planets: 4,
        blackHoles: 1,
        asteroidBelts: 1,
        gravity: 1.2,
        energyDensity: 0.7,
        formationRate: 0.4
      };

      const output = ProceduralUniverseGenerator.generate(config, particleSystem, ecosystemSystem);

      expect(output.entities.length).toBeGreaterThan(5);
      const starEntities = output.entities.filter((e) => e.type === 'STAR');
      const bhEntities = output.entities.filter((e) => e.type === 'BLACK_HOLE');
      const planetEntities = output.entities.filter((e) => e.type === 'PLANET');

      expect(starEntities.length).toBe(2);
      expect(bhEntities.length).toBe(1);
      expect(planetEntities.length).toBe(4);

      const buffer = particleSystem.getBuffer();
      // Verify particles were populated
      expect(
        buffer.positions[0] !== 0 || buffer.positions[1] !== 0 || buffer.positions[2] !== 0
      ).toBe(true);
    });
  });
});
