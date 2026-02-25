import type { Pokemon } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';

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

export const getRandomUpgrades = (count: number): Upgrade[] => {
  // Shuffle the array and take the first 'count' items
  const shuffled = [...UPGRADES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const scaleEnemyStats = (basePokemon: Pokemon, floor: number): Pokemon => {
  // Formula: Base Stat * (1 + (Floor * 0.1))
  // Example: Floor 5 = 1.5x stats
  const multiplier = 1 + (floor * 0.1); 

  return {
    ...basePokemon,
    level: floor, // Enemy Level = Floor Number
    maxHp: Math.floor(basePokemon.maxHp * multiplier),
    hp: Math.floor(basePokemon.maxHp * multiplier), // Heal them to full
    attack: Math.floor(basePokemon.attack * multiplier),
    speed: Math.floor(basePokemon.speed * multiplier), // Careful, speed ties get scary!
  };
};