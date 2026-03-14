// src/hooks/useMoveAnalysis.ts
import { useGameStore } from '../store/gameStore';
import { getTypeEffectiveness } from '../utils/gameLogic';
import { type Move } from '../types/move';

export const useMoveAnalysis = () => {
  const enemy = useGameStore((state) => state.enemy);

  /**
   * Returns a Tailwind CSS class string based on the move's effectiveness
   * against the current enemy.
   */
  const getMoveEffectivenessClass = (move: Move) => {
    if (!enemy) return 'border-white bg-gray-800';

    const effectiveness = getTypeEffectiveness(move.type, enemy.types);

    // Super Effective (Glow Green)
    if (effectiveness > 1) {
      return 'border-green-400 bg-green-900/40 shadow-[0_0_15px_rgba(74,222,128,0.4)]';
    }
    
    // Resisted/Immune (Dim and Grayish) - Note: Current gameLogic only returns 4 or 1
    // but this prepares us for the Advanced Type Chart (Item 3).
    if (effectiveness < 1) {
      return 'border-gray-600 bg-gray-900/60 opacity-60';
    }

    // Neutral (Standard)
    return 'border-white bg-gray-800';
  };

  return { getMoveEffectivenessClass };
};