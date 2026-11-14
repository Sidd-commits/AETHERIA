import { describe, it, expect, beforeEach } from 'vitest';
import { CommandBus } from '../../../src/core/CommandBus';
import { CommandValidator } from '../../../src/ai/validation/CommandValidator';
import { AIStructuredCommand } from '../../../src/types/ai';

describe('Command Bus & Validation Unit Tests', () => {
  let commandBus: CommandBus;

  beforeEach(() => {
    commandBus = CommandBus.getInstance();
  });

  describe('CommandBus Pub/Sub', () => {
    it('should dispatch typed commands to registered subscribers', () => {
      let received = false;
      let payloadReceived: any = null;

      const unsubscribe = commandBus.on('SET_PALETTE', (cmd) => {
        received = true;
        payloadReceived = cmd.payload;
      });

      commandBus.dispatch('SET_PALETTE', { index: 2 }, 'MOUSE_KEYBOARD');

      expect(received).toBe(true);
      expect(payloadReceived?.index).toBe(2);

      // Test unsubscribe
      received = false;
      unsubscribe();
      commandBus.dispatch('SET_PALETTE', { index: 3 }, 'MOUSE_KEYBOARD');
      expect(received).toBe(false);
    });

    it('should notify wildcard listeners on all commands', () => {
      const dispatchedTypes: string[] = [];

      const unsubscribe = commandBus.onAny((cmd) => {
        dispatchedTypes.push(cmd.type);
      });

      commandBus.dispatch('TOGGLE_PAUSE', undefined, 'MOUSE_KEYBOARD');
      commandBus.dispatch('RESET_UNIVERSE', undefined, 'MOUSE_KEYBOARD');

      expect(dispatchedTypes).toContain('TOGGLE_PAUSE');
      expect(dispatchedTypes).toContain('RESET_UNIVERSE');

      unsubscribe();
    });
  });

  describe('CommandValidator Security & Boundary Rules', () => {
    it('should reject null or malformed command objects', () => {
      const result = CommandValidator.validate(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate and clamp valid CREATE_PLANET command parameters', () => {
      const rawCmd: AIStructuredCommand = {
        action: 'CREATE_PLANET',
        confidence: 0.95,
        parameters: {
          radius: 999.0, // Out of bounds -> should clamp to 2.5
          mass: 5.0,
          color: '#00f2fe'
        }
      };

      const result = CommandValidator.validate(rawCmd);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.parameters.radius).toBe(2.5);
      expect(result.sanitizedCommand?.parameters.mass).toBe(5.0);
    });

    it('should flag destructive operations with isDestructive: true', () => {
      const destroyCmd: AIStructuredCommand = {
        action: 'CLEAR_ENTITIES',
        confidence: 0.95,
        parameters: {}
      };

      const result = CommandValidator.validate(destroyCmd);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.isDestructive).toBe(true);
    });

    it('should reject unknown/hallucinated command actions', () => {
      const invalidCmd: AIStructuredCommand = {
        action: 'MAKE_COFFEE' as any,
        confidence: 0.5,
        parameters: {}
      };

      const result = CommandValidator.validate(invalidCmd);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unknown or unsupported'))).toBe(true);
    });

    it('should validate CREATE_BLACK_HOLE parameters', () => {
      const bhCmd: AIStructuredCommand = {
        action: 'CREATE_BLACK_HOLE',
        confidence: 0.98,
        parameters: {
          mass: 150,
          position: { x: 0, y: 0, z: 0 }
        }
      };

      const result = CommandValidator.validate(bhCmd);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedCommand?.action).toBe('CREATE_BLACK_HOLE');
      expect(result.sanitizedCommand?.parameters.mass).toBe(150);
    });
  });
});
