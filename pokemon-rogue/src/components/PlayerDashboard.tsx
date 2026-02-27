import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { getEffectiveStat } from '../utils/gameLogic';

const TYPE_SYMBOLS: Record<string, string> = {
  normal: '⚪', fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  ice: '❄️', fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🦅',
  psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉',
  dark: '🌙', steel: '⚙️', fairy: '✨'
};

interface PlayerDashboardProps {
  player: Pokemon;
  enemy: Pokemon | null;
  playerTurn: boolean;
  handleMoveClick: (move: Move) => void;
}

export const PlayerDashboard = ({ player, enemy, playerTurn, handleMoveClick }: PlayerDashboardProps) => {
  return (
    <div className='w-[400px] bg-[#d3d3d3] flex flex-col border-r-4 border-black shrink-0 text-black'>
      {/* Top Stats Area */}
      <div className='p-6 flex-1'>
        <div className='space-y-2 text-sm font-bold border-b-4 border-black pb-4 mb-4'>
          <div className='flex justify-between'>
            <span className='text-red-700'>❤️ Health</span>
            <span>{player.stats.hp}/{player.stats.maxHp}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-orange-700'>👊 Attack</span>
            <span>{getEffectiveStat(player, 'attack')}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-blue-700'>🛡️ Defense</span>
            <span>{getEffectiveStat(player, 'defense')}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-yellow-600'>⚡ Speed</span>
            <span>{getEffectiveStat(player, 'speed')}</span>
          </div>
          <div className='flex justify-between text-gray-600 pt-2 border-t border-gray-400'>
            <span>🎯 Crit: {getEffectiveStat(player, 'critChance')}%</span>
            <span>💨 Dodge: {getEffectiveStat(player, 'dodge')}%</span>
          </div>
        </div>

        {/* RETRO SAO-STYLE EQUIPMENT MENU */}
        <div className='mt-6 bg-slate-900 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col relative overflow-hidden font-mono text-white'>
          
          <div className='h-2 w-full bg-red-600 border-b-4 border-black'></div>
          <div className='p-2 flex justify-between items-center border-b-4 border-black bg-slate-800'>
             <h3 className='text-gray-300 font-bold uppercase tracking-widest text-xs'>
                EQUIPMENT
             </h3>
             {player.equipment && player.equipment.length > 0 && (
               <span className="text-[10px] text-green-400 font-bold animate-pulse">
                 LINK_ACTIVE ({player.equipment.length}/6)
               </span>
             )}
          </div>
          
          <div className='relative h-52 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 overflow-hidden'>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`}
              alt="Avatar Silhouette"
              className="w-32 h-32 object-contain pixelated drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] z-10 brightness-150" 
            />
            
            {/* NEW: Dynamically map all 6 orbital slots */}
            {['top-4', 'top-10 right-12', 'bottom-12 right-12', 'bottom-4', 'bottom-12 left-12', 'top-10 left-12'].map((posClass, index) => {
              const item = player.equipment?.[index];
              return (
                <div key={index} className={`absolute ${posClass} w-10 h-10 rounded-full border-[3px] ${item ? 'border-purple-500 bg-slate-200 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'border-slate-500 bg-slate-800 shadow-inner'} flex items-center justify-center overflow-hidden z-20 transition-all`}>
                  {item ? (
                    <img src={item.spriteUrl} alt={item.name} className="w-6 h-6 object-contain pixelated drop-shadow-sm" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className='bg-slate-800 p-3 border-t-4 border-black z-30 relative'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='bg-purple-600 text-white rounded-sm border-2 border-black w-5 h-5 flex items-center justify-center text-[10px] font-bold'>✖</div>
              <span className='font-bold text-gray-200 text-sm tracking-widest'>INVENTORY</span>
            </div>
            <div className='pl-7 text-xs text-gray-400 space-y-1 min-h-[50px]'>
              {player.equipment && player.equipment.length > 0 ? (
                <>
                  <p className="font-bold text-purple-400 uppercase text-[10px] drop-shadow-sm leading-tight line-clamp-2">
                    {player.equipment.map(e => e.name).join(' ||')}
                  </p>
                  <p className="mt-2 font-bold text-gray-300">
                    <span className="text-green-400">
                      {/* NEW: Calculate Total Stats on the fly for the UI */}
                      {Object.entries(
                        player.equipment.reduce((acc, curr) => {
                          Object.entries(curr.statModifiers).forEach(([stat, val]) => {
                            acc[stat] = (acc[stat] || 0) + (val || 0);
                          });
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([stat, val]) => `${stat.toUpperCase()} ${val > 0 ? '+' : ''}${val}`).join(', ')}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-400/80 italic">No equipment detected.</p>
                  <p className="text-[10px]">Awaiting physical link...</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Left Moves Area */}
      <div className='h-[250px] bg-[#1a1a24] p-4 flex flex-col justify-end border-t-4 border-black'>
        {(!player || !enemy) ? null : playerTurn ? (
          <div className="grid grid-cols-2 gap-2 h-full">
            {player.moves?.map((move, index) => (
              <button
                key={index}
                onClick={() => handleMoveClick(move)}
                className="bg-transparent border-2 border-white hover:bg-white hover:text-black text-white font-bold uppercase text-sm rounded transition-all active:scale-95 flex flex-col items-center justify-center p-2 cursor-pointer"
              >
                <span className="text-lg mb-1 text-center leading-tight">{move.name}</span>
                <span className="text-[10px] opacity-70">{move.type}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className='text-red-500 font-bold text-xl animate-pulse'>ENEMY TURN</p>
          </div>
        )}
      </div>
    </div>
  );
};