import { useGameStore } from '../store/gameStore';
import { type Move } from '../types/move';

// Helper for type effectiveness (simplified example)
const getMoveMultiplier = (moveType: string, defenderTypes: string[]) => {
  // Logic from type chart...
  return 1; 
};

export const useMoveAnalysis = () => {
  const enemy = useGameStore(state => state.enemy);

  const getEffectivenessColor = (move: Move) => {
    if (!enemy) return '';
    const multiplier = getMoveMultiplier(move.type, enemy.types);

    if (multiplier > 1) return 'shadow-[0_0_10px_rgba(34,197,94,0.6)] border-green-500 bg-green-900/20'; 
    if (multiplier < 1 && multiplier > 0) return 'border-red-900/50 bg-red-900/10 opacity-80'; 
    if (multiplier === 0) return 'grayscale opacity-50 border-gray-900'; 
    return ''; 
  };

  return { getEffectivenessColor };
};