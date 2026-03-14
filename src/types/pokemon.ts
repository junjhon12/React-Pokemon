// src/types/pokemon.ts
import { type Move } from './move';
import { type Equipment } from './equipment';

export type StatKey = 'hp' | 'attack' | 'speed' | 'maxHp' | 'defense' | 'critChance' | 'dodge';
export type StageStatKey = 'attack' | 'defense' | 'speed';

export interface Pokemon {
  id: number;
  name: string;
  types: string[];
  stats: Record<StatKey, number>;
  level: number;
  moves: Move[];
  isPlayer: boolean;
  xp?: number;
  maxXp?: number;
  status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
  equipment?: Equipment[];
  stages?: Record<StageStatKey, number>; // Strictly typed keys
  learnset?: { 
    level: number; 
    name: string; 
    url: string; 
  }[];
}