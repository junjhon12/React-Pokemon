import type { Pokemon, StatKey } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';

export const EVOLUTION_MAP: Record<number, number> = {
  1: 2, 2: 3,       // Bulbasaur -> Ivysaur -> Venusaur
  4: 5, 5: 6,       // Charmander -> Charmeleon -> Charizard
  7: 8, 8: 9,       // Squirtle -> Wartortle -> Blastoise
  10: 11, 11: 12,   // Caterpie line
  13: 14, 14: 15,   // Weedle line
  16: 17, 17: 18,   // Pidgey line
  25: 26,           // Pikachu -> Raichu
  // You can easily expand this list later!
};

const TYPE_CHART: Record<string, string[]> = {
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  grass: ['water', 'ground', 'rock'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
  normal: [],
};

export const getTypeEffectiveness = (moveType: string, defenderTypes: string[]): number => {
  // If the move type exists in our chart, check if the defender has a weakness to it
  const isSuperEffective = TYPE_CHART[moveType]?.some((weakness) => 
    defenderTypes.includes(weakness)
  );

  return isSuperEffective ? 2 : 1;
};

const UPGRADES: Upgrade[] = [
  { id: '1', name: 'Protein', description: 'Increases Attack by 5', stat: 'attack', amount: 5 },
  { id: '2', name: 'Carbos', description: 'Increases Speed by 5', stat: 'speed', amount: 5 },
  { id: '3', name: 'HP Up', description: 'Increases Max HP by 10', stat: 'maxHp', amount: 10 },
  { id: '4', name: 'Potion', description: 'Heal 20 HP', stat: 'hp', amount: 20 },
  { id: '5', name: 'Iron', description: 'Increases Attack by 8 (Rare)', stat: 'attack', amount: 8 }, // Rare version
];

export const getRandomUpgrades = (count: number, playerId?: number): Upgrade[] => {
  let currentPool = [...UPGRADES];
  // Shuffle the array and take the first 'count' items
  if (playerId && EVOLUTION_MAP[playerId]) {
    currentPool.push({
      id: 'evo_stone',
      name: 'Evolution Stone',
      description: 'Evolve into your next form!',
      stat: 'evolve',
      amount: 0,
    });
  }
  const shuffled = currentPool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const scaleEnemyStats = (basePokemon: Pokemon, floor: number): Pokemon => {
  const multiplier = 1 + (floor * 0.1); 

  return {
    ...basePokemon,
    level: floor,
    stats: {
      ...basePokemon.stats, // Access stats object
      maxHp: Math.floor(basePokemon.stats.maxHp * multiplier),
      hp: Math.floor(basePokemon.stats.maxHp * multiplier),
      attack: Math.floor(basePokemon.stats.attack * multiplier),
      speed: Math.floor(basePokemon.stats.speed * multiplier),
    }
  };
};

export const getEffectiveStat = (mon: Pokemon, stat: StatKey) => {
    let baseValue = mon.stats[stat];
    if (mon.equipment && mon.equipment.length > 0) {
      mon.equipment.forEach(item => {
        if (item.statModifiers[stat]) {
          baseValue += item.statModifiers[stat]!;
        }
      });
    }
    return baseValue;
  };