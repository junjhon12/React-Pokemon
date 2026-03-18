import { describe, it, expect } from 'vitest';
import { getTypeEffectiveness, getEffectiveStat } from './gameLogic';
import type { Pokemon, Equipment } from '../types/pokemon';

describe('getTypeEffectiveness', () => {
  it('should return 2 for super effective moves', () => {
    expect(getTypeEffectiveness('fire', ['grass'])).toBe(2);
  });

  it('should return 1 for neutral moves', () => {
    expect(getTypeEffectiveness('normal', ['grass'])).toBe(1);
  });

  it('should return 0.5 for not very effective moves', () => {
    expect(getTypeEffectiveness('fire', ['water'])).toBe(0.5);
  });

  it('should return 0 for immune matchups', () => {
    expect(getTypeEffectiveness('normal', ['ghost'])).toBe(0);
  });

  it('should return 4 for dual-type double weakness', () => {
    expect(getTypeEffectiveness('ground', ['fire', 'rock'])).toBe(4);
  });

  it('should return 2 if the defender has dual types and is weak to one', () => {
    expect(getTypeEffectiveness('ice', ['dragon', 'flying'])).toBe(2);
  });

  it('should return 0.5 for dual types where one resists', () => {
    expect(getTypeEffectiveness('water', ['water', 'grass'])).toBe(0.25);
  });

  it('should return 0 if either defender type is immune', () => {
    expect(getTypeEffectiveness('electric', ['ground', 'flying'])).toBe(0);
  });

  it('should return 1 for unknown or undefined move types', () => {
    expect(getTypeEffectiveness('light', ['dark'])).toBe(1);
  });
});

describe('getEffectiveStat', () => {
  const mockPokemon: Pokemon = {
    id: 1,
    name: 'Bulbasaur',
    isPlayer: true,
    types: ['grass', 'poison'],
    stats: {
      hp: 45, maxHp: 45,
      attack: 49, defense: 49,
      specialAttack: 65, specialDefense: 65,
      speed: 45, critChance: 5, dodge: 0,
    },
    equipment: [],
    level: 0,
    moves: [],
  };

  const muscleBand: Equipment = {
    id: 'item-1', name: 'Muscle Band', description: '', spriteUrl: '',
    statModifiers: { attack: 15 },
  };

  const ironBall: Equipment = {
    id: 'item-2', name: 'Iron Ball', description: '', spriteUrl: '',
    statModifiers: { defense: 25, speed: -15 },
  };

  const choiceBand: Equipment = {
    id: 'item-3', name: 'Choice Band', description: '', spriteUrl: '',
    statModifiers: { attack: 20 },
  };

  it('should return the base stat when no equipment is held', () => {
    expect(getEffectiveStat(mockPokemon, 'attack')).toBe(49);
  });

  it('should add the stat modifier from a single piece of equipment', () => {
    const equippedMon = { ...mockPokemon, equipment: [muscleBand] };
    expect(getEffectiveStat(equippedMon, 'attack')).toBe(64);
  });

  it('should accurately stack modifiers from multiple equipment pieces', () => {
    const equippedMon = { ...mockPokemon, equipment: [muscleBand, choiceBand] };
    expect(getEffectiveStat(equippedMon, 'attack')).toBe(84);
  });

  it('should correctly apply negative stat penalties from items', () => {
    const equippedMon = { ...mockPokemon, equipment: [ironBall] };
    expect(getEffectiveStat(equippedMon, 'defense')).toBe(74);
    expect(getEffectiveStat(equippedMon, 'speed')).toBe(30);
  });

  it('should not crash if the equipment array is completely undefined', () => {
    const undefinedEquipMon = { ...mockPokemon };
    delete undefinedEquipMon.equipment;
    expect(getEffectiveStat(undefinedEquipMon, 'maxHp')).toBe(45);
  });

  it('should return base specialAttack stat', () => {
    expect(getEffectiveStat(mockPokemon, 'specialAttack')).toBe(65);
  });

  it('should return 1 for neutral moves', () => {
    expect(getTypeEffectiveness('normal', ['normal'])).toBe(1);
  });
});