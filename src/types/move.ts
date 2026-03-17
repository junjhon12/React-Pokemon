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
  // Drain: percentage of damage dealt that is returned to the attacker as HP (e.g. 50 = 50%)
  drain?: number;
  // Leech Seed: seeds the target; end-of-turn HP drain transferred to the attacker
  leechSeed?: boolean;
  // Last Resort: must not be usable unless every other move has been used at least once
  isLastResort?: boolean;
}