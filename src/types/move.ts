export interface Move {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  pp: number;
  maxPp: number;
  damageClass: 'physical' | 'special' | 'status';
  statusEffect?: 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep' | 'stunned';
  stageChange?: Record<string, number>;
  target?: 'self' | 'enemy';
  // Percentage of damage dealt returned as HP (e.g. 50 = 50%). Sourced from PokeAPI meta.drain.
  drain?: number;
  leechSeed?: boolean;
  // Fails unless every other known move has been used at least once this battle.
  isLastResort?: boolean;
}