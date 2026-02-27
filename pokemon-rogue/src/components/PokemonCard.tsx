import { type Pokemon } from '../types/pokemon';
import { HealthBar } from './HealthBar'; 

interface PokemonCardProps {
  pokemon: Pokemon;
}

// We map the type names to their official PokeAPI IDs to fetch the sprites
const TYPE_IDS: Record<string, number> = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6, bug: 7, ghost: 8, 
  steel: 9, fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15, 
  dragon: 16, dark: 17, fairy: 18
};

export const PokemonCard = ({ pokemon }: PokemonCardProps) => {
  return (
    <div 
      className="bg-[#2a2631] border-4 border-[#18161d] text-white p-3 w-64 shadow-xl font-mono relative" 
      style={{ borderRadius: '16px 4px 16px 4px' }}
    >
      <div className="flex justify-between items-end mb-2 border-b-2 border-gray-600 pb-1">
        {/* We added 'flex items-center gap-2' here to perfectly align the text and the new images */}
        <h2 className="font-bold text-lg tracking-wide flex items-center gap-2">
          {pokemon.name}
          
        </h2>
        <span className="font-bold text-sm">Lv. {pokemon.level || 1}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black text-green-400 italic">HP</span>
        <div className="flex-1">
          <HealthBar hp={pokemon.stats.hp} maxHp={pokemon.stats.maxHp} />
        </div>
      </div>
      <div className="text-right font-black text-sm">
        {pokemon.stats.hp} / {pokemon.stats.maxHp}
      </div>
      <span className="flex gap-1 drop-shadow-sm">
            {pokemon.types.map(t => (
              <img 
                key={t} 
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/sword-shield/${TYPE_IDS[t]}.png`}
                alt={t}
                title={t.toUpperCase()}
                className="h-4 object-contain pixelated"
              />
            ))}
          </span>
    </div>
  );
};