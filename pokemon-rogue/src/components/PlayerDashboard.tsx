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

        {/* SAO Style Equipment Menu */}
        <div className='mt-6 bg-white border-2 border-gray-300 rounded shadow-md flex flex-col relative overflow-hidden font-sans'>
          <div className='p-2 flex justify-center border-b border-gray-100'>
             <h2 className='text-sm uppercase flex justify-between items-center w-full px-2'>
                <span>{player.name}</span>
                <span className="flex gap-2 text-sm drop-shadow-sm">
                  {player.types.map(t => (
                    <span key={t} title={t.toUpperCase()}>{TYPE_SYMBOLS[t] || '⚪'}</span>
                  ))}
                </span>
             </h2>
          </div>
          
          {/* Central Display Area */}
          <div className='relative h-48 flex items-center justify-center bg-gradient-to-b from-white to-[#f4f4f4]'>
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`}
              alt="Avatar Silhouette"
              className="w-32 h-32 object-contain opacity-40 brightness-0 pointer-events-none" 
            />
            
            <div className='absolute top-4 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
            <div className='absolute top-10 right-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
            <div className='absolute bottom-10 right-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
            
            {/* Active/Selected Node (Orange) */}
            <div className='absolute bottom-4 w-10 h-10 rounded-full border-[3px] border-gray-200 bg-white shadow-md cursor-pointer flex items-center justify-center overflow-hidden'>
               {player.heldItem ? (
                 <img src={player.heldItem.spriteUrl} alt="held item" className="w-8 h-8 object-contain drop-shadow-sm" />
               ) : (
                 <div className="w-3 h-3 rounded-full bg-orange-400"></div>
               )}
            </div>
            
            <div className='absolute bottom-10 left-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
            <div className='absolute top-10 left-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
          </div>

          {/* SAO Style Detail Pane */}
          <div className='bg-[#e9ecef] p-3 border-t border-gray-200'>
            <div className='flex items-center gap-2 mb-1'>
              <div className='bg-gray-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold'>✖</div>
              <span className='font-bold text-gray-700 text-sm'>Held Item</span>
            </div>
            <div className='pl-6 text-xs text-gray-500 space-y-1 min-h-[50px]'>
              {player.heldItem ? (
                <>
                  <p className="font-bold text-black uppercase">{player.heldItem.name}</p>
                  <p className="leading-tight">{player.heldItem.description}</p>
                  <p className="mt-1 font-bold">
                    Bonuses: <span className="text-orange-500">
                      {Object.entries(player.heldItem.statModifiers).map(([stat, val]) => `${stat.toUpperCase()} ${val! > 0 ? '+' : ''}${val}`).join(', ')}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>No item currently equipped.</p>
                  <p>Stat Bonus: <span className="text-orange-400">0.00</span></p>
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