import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { getTypeEffectiveness } from './gameLogic';

const TACKLE: Move = {
  name: 'Tackle', power: 40, accuracy: 100, type: 'normal',
  pp: 99, maxPp: 99, damageClass: 'physical',
};

// Boss AI: super effective moves first, strongest neutral move as fallback.
// Support moves are saved for when the boss is low on HP, where a stat boost
// might matter more than another hit.
export const getSmartMove = (enemy: Pokemon, player: Pokemon): Move => {
  const moves = enemy.moves || [];
  if (moves.length === 0) return TACKLE;

  const usable = moves.filter(m => m.pp > 0);
  if (usable.length === 0) return moves[0];

  const superEffective = usable.filter(m => getTypeEffectiveness(m.type, player.types) > 1 && m.power > 0);
  if (superEffective.length > 0) {
    return superEffective.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
  }

  const enemyHpPercent = (enemy.stats.hp / enemy.stats.maxHp) * 100;
  if (enemyHpPercent < 30) {
    const supportMove = usable.find(m => m.power === 0);
    if (supportMove) return supportMove;
  }

  return usable.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
};