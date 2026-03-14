import { type Equipment } from './equipment';
import type { Move } from './move';

export type StatKey = 'hp' | 'attack' | 'speed' | 'maxHp' | 'defense' | 'critChance' | 'dodge';

// src/types/pokemon.ts

export interface Pokemon {
    id: number;
    name: string;
    stats: Record<StatKey, number>; 
    isPlayer: boolean; // Added back to fix API and Test errors
    level: number;     // Changed to required
    moves: Move[];     // Changed to required
    types: string[];
    xp?: number;
    maxXp?: number;
    status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
    equipment?: Equipment[];
    stages?: {
        attack: number;
        defense: number;
        speed: number;
    };
    // NEW: Learnset added to fix useRewards.ts errors
    learnset?: { 
        level: number; 
        name: string; 
        url: string; 
    }[];
}

export type { Equipment };
