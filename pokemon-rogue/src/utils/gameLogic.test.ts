import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness, getEffectiveStat } from './gameLogic';
import type { Pokemon, Equipment } from '../types/pokemon';

describe('getTypeEffectiveness', () => {
  it('should return 2 for super effective moves', () => {
    const multiplier = getTypeEffectiveness('fire', ['grass']);
    expect(multiplier).toBe(2);
  });

  it('should return 1 for normal effective moves', () => {
    const multiplier = getTypeEffectiveness('normal', ['grass']);
    expect(multiplier).toBe(1);
  });

  it('should return 2 if the defender has dual types and is weak to one', () => {
    const multiplier = getTypeEffectiveness('ice', ['dragon', 'flying']);
    expect(multiplier).toBe(2);
  });

  it('should return 1 for unknown or undefined types', () => {
    const multiplier = getTypeEffectiveness('light', ['dark']);
    expect(multiplier).toBe(1);
  });
});

describe('getEffectiveStat', () => {
  // 1. Setup Mock Data: A base Pokemon to test on
  const mockPokemon: Pokemon = {
    id: 1,
    name: 'Bulbasaur',
    isPlayer: true,
    types: ['grass', 'poison'],
    stats: {
      hp: 45, maxHp: 45, attack: 49, defense: 49, speed: 45, critChance: 5, dodge: 0,
    },
    equipment: []
  };

  // 2. Setup Mock Data: Fake items to equip
  const muscleBand: Equipment = {
    id: 'item-1', name: 'Muscle Band', description: '', spriteUrl: '',
    statModifiers: { attack: 15 }
  };

  const ironBall: Equipment = {
    id: 'item-2', name: 'Iron Ball', description: '', spriteUrl: '',
    statModifiers: { defense: 25, speed: -15 } // Has a negative penalty!
  };

  const choiceBand: Equipment = {
    id: 'item-3', name: 'Choice Band', description: '', spriteUrl: '',
    statModifiers: { attack: 20 }
  };

  it('should return the base stat when no equipment is held', () => {
    const attack = getEffectiveStat(mockPokemon, 'attack');
    expect(attack).toBe(49); // Base attack is 49
  });

  it('should add the stat modifier from a single piece of equipment', () => {
    const equippedMon = { ...mockPokemon, equipment: [muscleBand] };
    const attack = getEffectiveStat(equippedMon, 'attack');
    expect(attack).toBe(49 + 15); // 64
  });

  it('should accurately stack modifiers from multiple equipment pieces', () => {
    // Equipping TWO attack-boosting items
    const equippedMon = { ...mockPokemon, equipment: [muscleBand, choiceBand] };
    const attack = getEffectiveStat(equippedMon, 'attack');
    expect(attack).toBe(49 + 15 + 20); // 84
  });

  it('should correctly apply negative stat penalties from items', () => {
    const equippedMon = { ...mockPokemon, equipment: [ironBall] };
    const speed = getEffectiveStat(equippedMon, 'speed');
    const defense = getEffectiveStat(equippedMon, 'defense');
    
    expect(defense).toBe(49 + 25); // 74
    expect(speed).toBe(45 - 15);   // 30 (Proves the penalty works!)
  });

  it('should not crash if the equipment array is completely undefined', () => {
    const undefinedEquipMon = { ...mockPokemon };
    delete undefinedEquipMon.equipment; // Simulate a missing array
    
    const maxHp = getEffectiveStat(undefinedEquipMon, 'maxHp');
    expect(maxHp).toBe(45);
  });
});