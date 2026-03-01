import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness } from './gameLogic';

describe('getTypeEffectiveness', () => {
  it('should return 2 for super effective moves', () => {
    // Fire is super effective against Grass
    const multiplier = getTypeEffectiveness('fire', ['grass']);
    expect(multiplier).toBe(2);
  });

  it('should return 1 for normal effective moves', () => {
    // Normal is standard damage against Grass
    const multiplier = getTypeEffectiveness('normal', ['grass']);
    expect(multiplier).toBe(1);
  });

  it('should return 2 if the defender has dual types and is weak to one', () => {
    // Ice is super effective against Dragon (even if they are also Flying)
    const multiplier = getTypeEffectiveness('ice', ['dragon', 'flying']);
    expect(multiplier).toBe(2);
  });

  it('should return 1 for unknown or undefined types', () => {
    // A fallback safety check
    const multiplier = getTypeEffectiveness('light', ['dark']);
    expect(multiplier).toBe(1);
  });
});