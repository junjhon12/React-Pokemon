// src/types/pokemon.ts
import { type Move } from './move';
import { type Equipment } from './equipment';

export type StatKey = 'hp' | 'attack' | 'speed' | 'maxHp' | 'defense' | 'critChance' | 'dodge';
export type StageStatKey = 'attack' | 'defense' | 'speed';

export type { Equipment };

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
  // Added 'leech-seed' as a valid status
  status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep' | 'leech-seed';
  equipment?: Equipment[];
  stages?: Record<StageStatKey, number>;
  learnset?: {
    level: number;
    name: string;
    url: string;
  }[];
  // Tracks which move names have been used this battle (for Last Resort validation)
  usedMoveNames?: string[];
}