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

  // Visual configuration for each arena type
  const getArenaStyle = () => {
    switch (dungeonModifier) {
      case 'volcanic':
        return {
          bg: 'bg-[#2c0d0d]',
          overlay: 'bg-gradient-to-t from-orange-600/20 via-transparent to-black/40',
          effect: 'animate-pulse bg-red-500/5'
        };
      case 'thick-fog':
        return {
          bg: 'bg-[#2d3436]',
          overlay: 'backdrop-blur-[1px] bg-white/5',
          effect: 'animate-pulse bg-slate-200/10'
        };
      case 'electric-terrain':
        return {
          bg: 'bg-[#1a1a2e]',
          overlay: 'bg-gradient-to-b from-yellow-500/10 via-transparent to-blue-900/30',
          effect: 'shadow-[inset_0_0_100px_rgba(234,179,8,0.1)]'
        };
      case 'hail':
        return {
          bg: 'bg-[#dff9fb]',
          overlay: 'bg-gradient-to-br from-white/30 to-cyan-500/10',
          effect: 'bg-[url("https://www.transparenttextures.com/patterns/snow.png")] opacity-30'
        };
      default:
        // Classic Pokemon Grassy Field
        return {
          bg: 'bg-[#87ceeb]',
          overlay: 'bg-gradient-to-b from-transparent via-transparent to-[#90ee90]/40',
          effect: ''
        };
    }
  };

  const style = getArenaStyle();

  return (
    <div className={`w-full h-full relative overflow-hidden transition-all duration-1000 ${style.bg}`}>
      {/* Environmental Effects Layer */}
      <div className={`absolute inset-0 z-0 ${style.overlay}`} />
      <div className={`absolute inset-0 z-0 opacity-50 ${style.effect}`} />
      
      {/* Vignette for depth */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.4)_100%)]" />

      {/* Enemy Side */}
      <div className="absolute top-4 md:top-12 left-0 w-full px-4 md:px-10 flex justify-between items-start z-10">
        <div className="scale-75 origin-top-left md:scale-100 drop-shadow-lg">
          <PokemonCard pokemon={enemy} />
        </div>
        
        <div className={`relative flex flex-col items-center justify-end md:mr-10 mt-2 md:mt-4 ${enemyAnimation}`}>
          <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
            alt={enemy.name}
            className="w-24 h-24 sm:w-28 sm:h-28 md:w-48 md:h-48 pixelated drop-shadow-[0_20px_35px_rgba(0,0,0,0.5)] relative z-10"
          />
          {/* Sprite Platform/Shadow */}
          <div className="w-16 sm:w-20 md:w-32 h-3 sm:h-4 md:h-6 bg-black/30 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-md z-0"></div>
        </div>
      </div>

      {/* Player Side */}
      <div className="absolute bottom-2 md:bottom-12 left-0 w-full px-4 md:px-10 flex justify-between items-end z-20">
        <div className={`relative flex flex-col items-center justify-end md:ml-10 ${playerAnimation}`}>
          <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
            alt={player.name}
            className="w-28 h-28 sm:w-32 sm:h-32 md:w-64 md:h-64 pixelated drop-shadow-[0_25px_40px_rgba(0,0,0,0.6)] relative z-10"
          />
          {/* Sprite Platform/Shadow */}
          <div className="w-20 sm:w-24 md:w-48 h-4 sm:h-6 md:h-8 bg-black/30 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-md z-0"></div>
        </div>

        <div className="mb-2 md:mb-10 scale-75 origin-bottom-right md:scale-100 drop-shadow-lg">
          <PokemonCard pokemon={player} isPlayer={true} />
        </div>
      </div>
    </div>
  );
};