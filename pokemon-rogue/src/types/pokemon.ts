import { type Move } from './move';
import { type Equipment } from './equipment';


export type StatKey = 'hp' | 'attack' | 'speed' | 'maxHp' | 'defense' | 'critChance' | 'dodge';

export interface Pokemon {
    id: number;
    name: string;
    // Nest the stats in their own object for easier mapping
    stats: Record<StatKey, number>; 
    isPlayer: boolean;
    level?: number;
    moves?: Move[];
    types: string[];
    xp?: number;
    maxXp?: number;
    status?: 'normal' | 'burn' | 'poison' | 'paralyze' | 'freeze';
    heldItem?: Equipment;
}