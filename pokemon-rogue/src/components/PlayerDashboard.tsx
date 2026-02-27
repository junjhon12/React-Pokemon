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
          
          {/* Header line mimicking SAO menu accent but retro */}
          <div className='h-2 w-full bg-red-600 border-b-4 border-black'></div>
          <div className='p-2 flex justify-between items-center border-b-4 border-black bg-slate-800'>
             {player.name.toUpperCase()}
             <span className="flex gap-2 text-sm drop-shadow-sm">
                {player.types.map(t => (
                <span key={t} title={t.toUpperCase()}>{TYPE_SYMBOLS[t] || '⚪'}</span>
                ))}
            </span>
             <span className='text-xs text-gray-400 tracking-widest'>LV. {player.level}</span>
          </div>
          
          {/* Central Display Area (The "VR" room but retro) */}
          <div className='relative h-52 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-900 overflow-hidden'>
            
            {/* Retro Grid Background Effect */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

            {/* Character Sprite (Hologram Style) */}
            <img 
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`}
              alt="Avatar Silhouette"
              className="w-32 h-32 object-contain pixelated drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] z-10 brightness-150" 
            />
            
            {/* Equipment Nodes (Orbital positioning - retro styled) */}
            <div className='absolute top-4 w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-800 shadow-inner z-20'></div>
            <div className='absolute top-10 right-12 w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-800 shadow-inner z-20'></div>
            <div className='absolute bottom-12 right-12 w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-800 shadow-inner z-20'></div>
            
            {/* Active/Selected Node (Bottom Center) */}
            <div className={`absolute bottom-4 w-12 h-12 rounded-full border-4 ${player.heldItem ? 'border-purple-500 bg-slate-200' : 'border-slate-500 bg-slate-800'} shadow-[0_0_15px_rgba(168,85,247,0.6)] flex items-center justify-center overflow-hidden z-20 transition-all`}>
               {player.heldItem ? (
                 <img src={player.heldItem.spriteUrl} alt="held item" className="w-8 h-8 object-contain pixelated" />
               ) : (
                 <div className="w-3 h-3 rounded-full bg-slate-600"></div>
               )}
            </div>
            
            <div className='absolute bottom-12 left-12 w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-800 shadow-inner z-20'></div>
            <div className='absolute top-10 left-12 w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-800 shadow-inner z-20'></div>
          </div>

          {/* SAO Style Detail Pane (Retro Tech Look) */}
          <div className='bg-slate-800 p-3 border-t-4 border-black z-30 relative'>
            <div className='flex items-center gap-2 mb-2'>
              <div className='bg-purple-600 text-white rounded-sm border-2 border-black w-5 h-5 flex items-center justify-center text-[10px] font-bold'>✖</div>
              <span className='font-bold text-gray-200 text-sm tracking-widest'>HELD_ITEM</span>
            </div>
            <div className='pl-7 text-xs text-gray-400 space-y-1 min-h-[50px]'>
              {player.heldItem ? (
                <>
                  <p className="font-bold text-purple-400 uppercase text-sm drop-shadow-sm">{player.heldItem.name}</p>
                  <p className="leading-tight text-[10px]">{player.heldItem.description}</p>
                  <p className="mt-2 font-bold text-gray-300">
                    SYS_BONUS: <span className="text-green-400">
                      {Object.entries(player.heldItem.statModifiers).map(([stat, val]) => `${stat.toUpperCase()} ${val! > 0 ? '+' : ''}${val}`).join(', ')}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-400/80 italic">No equipment detected.</p>
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