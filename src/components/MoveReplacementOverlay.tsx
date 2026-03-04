import { useGameStore } from '../store/gameStore';
import { type Move } from '../types/move';

interface MoveReplacementOverlayProps {
  handleReplaceMove: (index: number) => void;
  handleSkipMove: () => void;
}

export const MoveReplacementOverlay = ({ handleReplaceMove, handleSkipMove }: MoveReplacementOverlayProps) => {
  const { player, pendingMove } = useGameStore();

  if (!player || !pendingMove) return null;

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
      
      <div className="max-w-xl w-full flex flex-col items-center">
        <h2 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 drop-shadow-md text-center leading-tight">
          {player.name} wants to learn <span className="text-yellow-400">{pendingMove.name}</span>!
        </h2>
        <p className="text-xs md:text-sm text-gray-300 mb-6 md:mb-8 text-center">
          But {player.name} already knows 4 moves. Choose a move to forget, or give up on learning {pendingMove.name}.
        </p>

        {/* The New Move Details */}
        <div className="bg-blue-900/40 border-2 border-blue-400 p-3 md:p-4 rounded-xl mb-6 md:mb-8 w-full max-w-sm flex justify-between items-center shadow-[0_0_15px_rgba(96,165,250,0.3)]">
          <div className="flex flex-col">
            <span className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">New Move</span>
            <span className="text-lg md:text-xl font-bold text-white uppercase">{pendingMove.name}</span>
          </div>
          <div className="flex flex-col items-end text-sm md:text-base font-bold">
            <span className={`${getTypeColor(pendingMove.type)} uppercase`}>{pendingMove.type}</span>
            <span className="text-gray-300">PWR: {pendingMove.power || '--'}</span>
          </div>
        </div>

        {/* Existing Moves Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
          {player.moves?.map((move: Move, index: number) => (
            <button
              key={index}
              onClick={() => handleReplaceMove(index)}
              className="bg-gray-800 border-2 border-red-500 hover:bg-red-900/60 p-3 rounded-lg transition-all text-white flex justify-between items-center cursor-pointer group"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs text-red-400 group-hover:text-red-300 font-bold uppercase tracking-widest mb-0.5">Forget</span>
                <span className="text-sm md:text-base font-bold uppercase">{move.name}</span>
              </div>
              <div className="flex flex-col items-end text-xs md:text-sm font-bold">
                <span className={`${getTypeColor(move.type)} uppercase`}>{move.type}</span>
                <span className="text-gray-400">PWR: {move.power || '--'}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Give Up Button */}
        <button 
          onClick={handleSkipMove}
          className="bg-transparent border-2 border-gray-500 hover:bg-gray-800 text-gray-300 px-6 py-3 rounded-xl font-bold text-sm md:text-base transition-colors cursor-pointer"
        >
          Keep current moves
        </button>

      </div>
    </div>
  );
};

// Quick helper to colorize move types
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    normal: 'text-gray-400', fire: 'text-red-500', water: 'text-blue-500', grass: 'text-green-500',
    electric: 'text-yellow-400', ice: 'text-cyan-300', fighting: 'text-orange-600', poison: 'text-purple-500',
    ground: 'text-amber-600', flying: 'text-indigo-300', psychic: 'text-pink-500', bug: 'text-lime-500',
    rock: 'text-stone-500', ghost: 'text-violet-600', dragon: 'text-indigo-600', dark: 'text-zinc-700',
    steel: 'text-slate-400', fairy: 'text-rose-400',
  };
  return colors[type] || 'text-white';
}