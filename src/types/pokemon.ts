import { type Move } from './move';
import { type Equipment } from './equipment';

export type StatKey = 'hp' | 'attack' | 'speed' | 'maxHp' | 'defense' | 'critChance' | 'dodge';

// src/types/pokemon.ts

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    critChance: number;
    dodge: number;
  };
  stages?: {
    attack: number;
    defense: number;
    speed: number;
  };
  level: number;
  xp?: number;
  maxXp?: number;
  moves: any[]; 
  equipment?: any[];
  status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
}

export type { Equipment };
