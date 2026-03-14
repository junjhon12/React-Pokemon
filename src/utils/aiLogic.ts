// src/utils/aiLogic.ts
import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { getTypeEffectiveness } from './gameLogic';

/**
 * Smart AI logic for Boss encounters.
 * Prioritizes Super Effective moves and uses support moves when appropriate.
 */
export const getSmartMove = (enemy: Pokemon, player: Pokemon): Move => {
  const moves = enemy.moves || [];
  if (moves.length === 0) {
    return { name: 'Tackle', power: 40, accuracy: 100, type: 'normal', pp: 99 } as Move;
  }

  // 1. Filter for damaging moves that have PP
  const usableMoves = moves.filter(m => m.pp > 0);
  if (usableMoves.length === 0) return moves[0]; // Fallback if out of PP

  // 2. Identify Super Effective moves
  const superEffectiveMoves = usableMoves.filter(m => 
    getTypeEffectiveness(m.type, player.types) > 1 && m.power > 0
  );

  if (superEffectiveMoves.length > 0) {
    // Pick the strongest super effective move
    return superEffectiveMoves.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
  }

  // 3. If health is low (under 30%), prioritize moves that might provide utility
  // (Assuming future support moves have power 0)
  const enemyHealthPercent = (enemy.stats.hp / enemy.stats.maxHp) * 100;
  if (enemyHealthPercent < 30) {
    const supportMove = usableMoves.find(m => m.power === 0);
    if (supportMove) return supportMove;
  }

  // 4. Fallback: Strongest available neutral damaging move
  return usableMoves.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
};