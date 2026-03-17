// src/types/move.ts
export interface Move {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  // 'physical' uses Attack vs Defense, 'special' uses SpAtk vs SpDef, 'status' deals no damage
  damageClass: 'physical' | 'special' | 'status';
  statusEffect?: 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep' | 'stunned';
  stageChange?: Record<string, number>;
  target?: 'self' | 'enemy';
  drain?: number;
  leechSeed?: boolean;
  isLastResort?: boolean;
}