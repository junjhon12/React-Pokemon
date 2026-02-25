import { type Pokemon } from '../types/pokemon';
import { HealthBar } from './HealthBar'; // Make sure this import exists!

interface PokemonCardProps {
  pokemon: Pokemon;
}

export const PokemonCard = ({ pokemon }: PokemonCardProps) => {
  // 1. Get the Sprite Image
  const imgSrc = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;

  return (
    <div className="border-4 border-slate-800 rounded-xl bg-slate-100 w-64 shadow-xl overflow-hidden relative text-black">
      
      {/* Header */}
      <div className="bg-slate-800 text-white p-2 flex justify-between items-center">
        <h2 className="font-bold text-lg capitalize">{pokemon.name}</h2>
        <span className="text-sm font-mono text-slate-300">LVL {pokemon.level || 1}</span>
      </div>

      {/* Image */}
      <div className="bg-white p-4 flex justify-center items-center h-40">
        <img 
            src={imgSrc} 
            alt={pokemon.name} 
            className="w-32 h-32 object-contain pixelated" 
        />
      </div>

      {/* Stats & Health Bar */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
          <span>HP</span>
          <span>{pokemon.hp}/{pokemon.maxHp}</span>
        </div>
        
        {/* THIS IS THE MISSING PIECE */}
        <HealthBar hp={pokemon.hp} maxHp={pokemon.maxHp} />

        <div className="flex justify-between mt-4 text-sm text-slate-700 font-bold">
          <div className="bg-slate-200 px-3 py-1 rounded">⚔️ {pokemon.attack}</div>
          <div className="bg-slate-200 px-3 py-1 rounded">⚡ {pokemon.speed}</div>
        </div>
      </div>
      
    </div>
  );
};