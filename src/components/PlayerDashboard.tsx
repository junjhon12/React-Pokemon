import { type Move } from '../types/move';
import { getEffectiveStat } from '../utils/gameLogic';
import { useGameStore } from '../store/gameStore';
import { HealthBar } from './HealthBar';

interface PlayerDashboardProps {
  handleMoveClick: (move: Move) => void;
}

export const PlayerDashboard = ({ handleMoveClick }: PlayerDashboardProps) => {
  const { player, enemy, playerTurn } = useGameStore();

  if (!player || !enemy) return null;

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fire: 'bg-orange-600', water: 'bg-blue-600', grass: 'bg-green-600',
      electric: 'bg-yellow-500', psychic: 'bg-pink-500', ice: 'bg-cyan-400',
      dragon: 'bg-indigo-700', ghost: 'bg-purple-800', normal: 'bg-gray-500'
    };
    return colors[type.toLowerCase()] || 'bg-gray-600';
  };

  const xpPercentage = ((player.xp || 0) / (player.maxXp || 1)) * 100;

  return (
    // order-3 places this entire block between the Arena and the Log on mobile
    <div className='order-3 md:order-0 w-full md:w-100 bg-[#d3d3d3] flex flex-col md:border-r-4 border-black shrink-0 text-black'>
      
      {/* Moves Container - order-1 on mobile to sit right under the Arena */}
      <div className='order-1 md:order-3 min-h-30 md:h-62.5 bg-[#1a1a24] p-3 md:p-4 flex flex-col justify-end border-b-4 md:border-b-0 md:border-t-4 border-black'>
        {playerTurn ? (
          <div className="grid grid-cols-2 gap-2 h-full">
            {player.moves?.map((move, index) => {
              const isOutOfPP = move.pp <= 0;
              return (
                <button
                  key={index}
                  onClick={() => handleMoveClick(move)}
                  disabled={isOutOfPP}
                  className={`relative p-2 rounded border-2 text-left transition-all flex flex-col justify-between ${
                    isOutOfPP 
                      ? 'bg-gray-900 border-gray-900 opacity-40 cursor-not-allowed' 
                      : 'bg-gray-800 border-white hover:bg-white group cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className={`font-bold text-[10px] md:text-xs uppercase truncate w-24 transition-colors ${!isOutOfPP ? 'text-white group-hover:text-black' : 'text-gray-500'}`}>
                      {move.name}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getTypeColor(move.type)} shadow-sm`} title={move.type} />
                  </div>

                  <div className="flex justify-between items-end w-full mt-1">
                    <div className="flex gap-2 text-[8px] md:text-[9px]">
                      <div className="flex flex-col">
                        <span className="text-gray-500 uppercase leading-none">Pwr</span>
                        <span className={`font-bold transition-colors ${!isOutOfPP ? 'text-gray-200 group-hover:text-gray-700' : 'text-gray-600'}`}>{move.power || '--'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500 uppercase leading-none">Acc</span>
                        <span className={`font-bold transition-colors ${!isOutOfPP ? 'text-gray-200 group-hover:text-gray-700' : 'text-gray-600'}`}>{move.accuracy}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 uppercase text-[8px] block leading-none">PP</span>
                      <span className={`text-[9px] md:text-[10px] font-black transition-colors ${
                        isOutOfPP ? 'text-red-900' : 
                        move.pp < 3 ? 'text-red-500' : 
                        'text-white group-hover:text-black'
                      }`}>
                        {move.pp}/{move.maxPp || move.pp}
                      </span>
                    </div>
                  </div>

                  {isOutOfPP && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">DEPLETED</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className='text-red-500 font-bold text-lg md:text-xl animate-pulse'>ENEMY TURN</p>
          </div>
        )}
      </div>

      {/* Equipment Container - order-2 on mobile */}
      <div className='order-2 md:order-2 bg-slate-900 border-b-4 md:border-b-0 md:border-t-4 border-black flex flex-col relative overflow-hidden font-mono text-white mt-0 md:mt-6'>
        <div className='h-1 md:h-2 w-full bg-red-600 border-b-2 md:border-b-4 border-black'></div>
        <div className='p-2 flex justify-between items-center border-b-2 md:border-b-4 border-black bg-slate-800'>
           <h3 className='text-gray-300 font-bold uppercase tracking-widest text-[10px] md:text-xs'>
              EQUIPMENT
           </h3>
           <span className='text-xs md:text-base'>{player.name}</span>
           {player.equipment && player.equipment.length > 0 && (
             <span className="text-[8px] md:text-[10px] text-green-400 font-bold animate-pulse">
               LINK ({player.equipment.length}/6)
             </span>
           )}
        </div>
        
        <div className='relative h-28 md:h-52 flex items-center justify-center bg-linear-to-b from-slate-700 to-slate-900 overflow-hidden'>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

          <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`}
            alt="Avatar Silhouette"
            className="w-16 h-16 md:w-32 md:h-32 object-contain pixelated drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] z-10 brightness-150" 
          />
          
          {['top-2 md:top-4', 'top-4 right-8 md:top-10 md:right-12', 'bottom-4 right-8 md:bottom-12 md:right-12', 'bottom-2 md:bottom-4', 'bottom-4 left-8 md:bottom-12 md:left-12', 'top-4 left-8 md:top-10 md:left-12'].map((posClass, index) => {
            const item = player.equipment?.[index];
            return (
              <div key={index} className={`absolute ${posClass} w-6 h-6 md:w-10 md:h-10 rounded-full border-2 md:border-[3px] ${item ? 'border-purple-500 bg-slate-200 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'border-slate-500 bg-slate-800 shadow-inner'} flex items-center justify-center overflow-hidden z-20 transition-all`}>
                {item ? (
                  <img src={item.spriteUrl} alt={item.name} className="w-4 h-4 md:w-6 md:h-6 object-contain pixelated drop-shadow-sm" />
                ) : (
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-600"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Container - order-3 on mobile */}
      <div className='order-3 md:order-1 p-4 md:p-6 flex-1'>
        <div className='space-y-1 md:space-y-2 text-xs md:text-sm font-bold md:border-b-4 md:border-black md:pb-4'>
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
      </div>

    </div>
  );
};