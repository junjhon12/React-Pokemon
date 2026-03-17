// src/types/pokemon.ts
import { type Move } from './move';
import { type Equipment } from './equipment';

export type StatKey =
  | 'hp' | 'maxHp'
  | 'attack' | 'defense'
  | 'specialAttack' | 'specialDefense'
  | 'speed' | 'critChance' | 'dodge';

export type StageStatKey = 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed';

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
  status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep' | 'leech-seed';
  equipment?: Equipment[];
  stages?: Record<StageStatKey, number>;
  learnset?: {
    level: number;
    name: string;
    url: string;
  }[];
  usedMoveNames?: string[];
}