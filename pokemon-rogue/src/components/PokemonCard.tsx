import { type Pokemon } from '../types/pokemon';
import { HealthBar } from './HealthBar'; 

interface PokemonCardProps {
  pokemon: Pokemon;
}

const TYPE_SYMBOLS: Record<string, string> = {
  normal: '⚪', fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  ice: '❄️', fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🦅',
  psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉',
  dark: '🌙', steel: '⚙️', fairy: '✨'
};

export const PokemonCard = ({ pokemon }: PokemonCardProps) => {
  return (
    <div 
      className="bg-[#2a2631] border-4 border-[#18161d] text-white p-3 w-64 shadow-xl font-mono relative" 
      style={{ borderRadius: '16px 4px 16px 4px' }}
    >
      <div className="flex justify-between items-end mb-2 border-b-2 border-gray-600 pb-1">
        <h2 className="font-bold text-lg tracking-wide">{pokemon.name}</h2>
        <span className="font-bold text-sm">Lv. {pokemon.level || 1}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black text-green-400 italic">HP</span>
        <div className="flex-1">
          <HealthBar hp={pokemon.stats.hp} maxHp={pokemon.stats.maxHp} />
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className="flex gap-1">
          {pokemon.types.map(t => (
            <span key={t} title={t.toUpperCase()} className="text-xl">{TYPE_SYMBOLS[t] || '⚪'}</span>
          ))}
        </div>
        <div className="font-bold text-lg">
          {pokemon.stats.hp} / {pokemon.stats.maxHp}
        </div>
      </div>
    </div>
  );
};