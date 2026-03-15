import { type Pokemon } from '../types/pokemon';
import { HealthBar } from './HealthBar';

interface PokemonCardProps {
  pokemon: Pokemon;
  isPlayer?: boolean;
}

const TYPE_IDS: Record<string, number> = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6, bug: 7, ghost: 8,
  steel: 9, fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15,
  dragon: 16, dark: 17, fairy: 18
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  burn:     { label: 'BRN', color: 'bg-orange-600 text-orange-100' },
  poison:   { label: 'PSN', color: 'bg-purple-600 text-purple-100' },
  paralyze: { label: 'PAR', color: 'bg-yellow-500 text-yellow-900' },
  freeze:   { label: 'FRZ', color: 'bg-cyan-400 text-cyan-900'    },
  sleep:    { label: 'SLP', color: 'bg-gray-500 text-gray-100'    },
};

export const PokemonCard = ({ pokemon, isPlayer }: PokemonCardProps) => {
  const xpPercentage = isPlayer ? ((pokemon.xp || 0) / (pokemon.maxXp || 1)) * 100 : 0;
  const statusConfig = pokemon.status && pokemon.status !== 'normal'
    ? STATUS_CONFIG[pokemon.status]
    : null;

  return (
    <div
      className="bg-[#2a2631] border-4 border-[#18161d] text-white p-3 w-64 shadow-xl font-mono relative"
      style={{ borderRadius: '16px 4px 16px 4px' }}
    >
      <div className="flex justify-between items-end mb-2 border-b-2 border-gray-600 pb-1">
        <h2 className="font-bold text-lg tracking-wide flex items-center gap-2">
          {pokemon.name}
          {statusConfig && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          )}
        </h2>
        <span className="font-bold text-sm">Lv. {pokemon.level || 1}</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-black text-green-400 italic">HP</span>
        <div className="flex-1">
          <HealthBar
            hp={pokemon.stats.hp}
            maxHp={pokemon.stats.maxHp}
            isPlayer={isPlayer}
            xpProgress={xpPercentage}
          />
        </div>
      </div>
      <div className="text-right font-black text-sm">
        {Math.ceil(pokemon.stats.hp)} / {pokemon.stats.maxHp}
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