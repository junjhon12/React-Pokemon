// src/types/move.ts
export interface Move {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  statusEffect?: 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep' | 'stunned';
  stageChange?: Record<string, number>; 
  target?: 'self' | 'enemy';
}