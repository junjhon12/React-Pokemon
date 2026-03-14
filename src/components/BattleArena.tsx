import React from 'react';
import { PokemonCard } from './PokemonCard';
import { type Pokemon } from '../types/pokemon';
import { type DungeonModifier } from '../store/gameStore';

interface BattleArenaProps {
  player: Pokemon;
  enemy: Pokemon;
  playerAnimation: string;
  enemyAnimation: string;
  dungeonModifier: DungeonModifier;
}

export const BattleArena = ({ 
  player, 
  enemy, 
  playerAnimation, 
  enemyAnimation, 
  dungeonModifier 
}: BattleArenaProps) => {

  // Logic moved from App.tsx to keep the arena self-contained
  const getArenaBackground = () => {
    switch (dungeonModifier) {
      case 'volcanic':
        return 'bg-gradient-to-b from-orange-900/40 via-red-900/20 to-transparent';
      case 'thick-fog':
        return 'bg-gradient-to-b from-gray-500/40 via-slate-700/20 to-transparent backdrop-blur-[2px]';
      case 'electric-terrain':
        return 'bg-gradient-to-b from-yellow-600/30 via-blue-900/20 to-transparent';
      case 'hail':
        return 'bg-gradient-to-b from-cyan-100/20 via-blue-400/10 to-transparent';
      default:
        return 'bg-gradient-to-b from-blue-900/20 to-transparent';
    }
  };

  return (
    <div className={`order-2 md:order-3 w-full min-h-[40vh] md:min-h-0 md:flex-1 relative overflow-hidden transition-colors duration-1000 ${getArenaBackground()}`}>
      {/* Enemy Side */}
      <div className="absolute top-4 md:top-12 left-0 w-full px-4 md:px-10 flex justify-between items-start z-10">
        <div className="scale-75 origin-top-left md:scale-100">
          <PokemonCard pokemon={enemy} />
        </div>
        
        <div className={`relative flex flex-col items-center justify-end md:mr-10 mt-2 md:mt-4 ${enemyAnimation}`}>
          <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
            alt={enemy.name}
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-48 md:h-48 pixelated drop-shadow-2xl relative z-10"
          />
          <div className="w-16 sm:w-20 md:w-32 h-3 sm:h-4 md:h-6 bg-black/20 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-sm z-0"></div>
        </div>
      </div>

      {/* Player Side */}
      <div className="absolute bottom-2 md:bottom-12 left-0 w-full px-4 md:px-10 flex justify-between items-end z-20">
        <div className={`relative flex flex-col items-center justify-end md:ml-10 ${playerAnimation}`}>
          <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
            alt={player.name}
            className="w-28 h-28 sm:w-32 sm:h-32 md:w-56 md:h-56 pixelated drop-shadow-2xl relative z-10"
          />
          <div className="w-20 sm:w-24 md:w-40 h-4 sm:h-6 md:h-8 bg-black/20 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-sm z-0"></div>
        </div>

        <div className="mb-2 md:mb-10 scale-75 origin-bottom-right md:scale-100">
          <PokemonCard pokemon={player} isPlayer={true} />
        </div>
      </div>
    </div>
  );
};