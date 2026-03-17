// src/utils/aiLogic.ts
import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { getTypeEffectiveness } from './gameLogic';

const TACKLE: Move = {
  name: 'Tackle', power: 40, accuracy: 100, type: 'normal',
  pp: 99, maxPp: 99, damageClass: 'physical',
};

export const getSmartMove = (enemy: Pokemon, player: Pokemon): Move => {
  const moves = enemy.moves || [];
  if (moves.length === 0) return TACKLE;

  const usableMoves = moves.filter(m => m.pp > 0);
  if (usableMoves.length === 0) return moves[0];

  const superEffectiveMoves = usableMoves.filter(m =>
    getTypeEffectiveness(m.type, player.types) > 1 && m.power > 0
  );

  if (superEffectiveMoves.length > 0) {
    return superEffectiveMoves.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
  }

  const enemyHealthPercent = (enemy.stats.hp / enemy.stats.maxHp) * 100;
  if (enemyHealthPercent < 30) {
    const supportMove = usableMoves.find(m => m.power === 0);
    if (supportMove) return supportMove;
  }

  return usableMoves.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
};