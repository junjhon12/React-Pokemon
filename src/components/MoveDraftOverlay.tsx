// src/components/MoveDraftOverlay.tsx
import { useGameStore } from '../store/gameStore';
import { type Move } from '../types/move';

interface MoveDraftOverlayProps {
  handlePickMove: (move: Move | null) => void;
}

const TYPE_COLORS: Record<string, string> = {
  normal: 'text-gray-400', fire: 'text-orange-400', water: 'text-blue-400',
  grass: 'text-green-400', electric: 'text-yellow-400', ice: 'text-cyan-300',
  fighting: 'text-orange-600', poison: 'text-purple-400', ground: 'text-amber-500',
  flying: 'text-indigo-300', psychic: 'text-pink-400', bug: 'text-lime-400',
  rock: 'text-stone-400', ghost: 'text-violet-500', dragon: 'text-indigo-500',
  dark: 'text-gray-500', steel: 'text-slate-400', fairy: 'text-rose-400',
};

const CLASS_COLORS: Record<string, string> = {
  physical: 'text-orange-300',
  special:  'text-blue-300',
  status:   'text-gray-400',
};

const CLASS_ICONS: Record<string, string> = {
  physical: '⚔',
  special:  '✦',
  status:   '—',
};

export const MoveDraftOverlay = ({ handlePickMove }: MoveDraftOverlayProps) => {
  const { pendingMoveChoices, player } = useGameStore();

  if (!pendingMoveChoices || pendingMoveChoices.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full flex flex-col items-center">

        <h2 className="text-xl md:text-3xl font-black text-yellow-400 mb-1 text-center drop-shadow-md">
          LEARN A NEW MOVE
        </h2>
        <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest text-center">
          {player?.name} can learn one of these moves
        </p>

        {/* Move choices */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {pendingMoveChoices.map((move, i) => (
            <button
              key={i}
              onClick={() => handlePickMove(move)}
              className="bg-gray-800 border-2 border-yellow-500 hover:bg-gray-700 hover:border-yellow-300 hover:shadow-[0_0_12px_rgba(234,179,8,0.4)] p-4 rounded-xl transition-all text-white text-left cursor-pointer flex flex-col gap-2"
            >
              {/* Move name + type */}
              <div className="flex justify-between items-start">
                <span className="font-black text-sm md:text-base uppercase leading-tight">
                  {move.name}
                </span>
                <span className={`text-xs font-bold uppercase ${TYPE_COLORS[move.type] ?? 'text-white'}`}>
                  {move.type}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex justify-between items-end text-xs">
                <div className="flex gap-3">
                  <div className="flex flex-col">
                    <span className="text-gray-500 uppercase leading-none">Pwr</span>
                    <span className="font-bold text-gray-200">{move.power || '--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 uppercase leading-none">Acc</span>
                    <span className="font-bold text-gray-200">{move.accuracy}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 uppercase leading-none">PP</span>
                    <span className="font-bold text-gray-200">{move.maxPp}</span>
                  </div>
                </div>
                <span className={`font-black text-sm ${CLASS_COLORS[move.damageClass] ?? 'text-gray-400'}`}>
                  {CLASS_ICONS[move.damageClass]}
                </span>
              </div>

              {/* Special tags */}
              <div className="flex gap-1 flex-wrap">
                {move.statusEffect && (
                  <span className="text-[9px] bg-purple-900 text-purple-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                    {move.statusEffect}
                  </span>
                )}
                {move.drain && move.drain > 0 && (
                  <span className="text-[9px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                    drain {move.drain}%
                  </span>
                )}
                {move.leechSeed && (
                  <span className="text-[9px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                    leech seed
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={() => handlePickMove(null)}
          className="text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-6 py-2 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Skip — don't learn anything
        </button>
      </div>
    </div>
  );
};