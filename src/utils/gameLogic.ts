// src/utils/gameLogic.ts
import type { Pokemon, StatKey, StageStatKey } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';
import type { DungeonModifier } from '../store/gameStore';
import { applyStatStage } from './statCalculator'; 

export const EVOLUTION_MAP: Record<number, number> = {
  1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9, 10: 11, 11: 12, 13: 14, 14: 15, 16: 17, 17: 18, 25: 26,           
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
  const isSuperEffective = TYPE_CHART[moveType]?.some((weakness) => defenderTypes.includes(weakness));
  return isSuperEffective ? 2 : 1;
};

const UPGRADES: Upgrade[] = [
  { id: '1', name: 'Protein', description: 'Increases Attack by 2', stat: 'attack', amount: 2 },
  { id: '2', name: 'Carbos', description: 'Increases Speed by 2', stat: 'speed', amount: 2 },
  { id: '3', name: 'HP Up', description: 'Increases Max HP by 10', stat: 'maxHp', amount: 10 },
  { id: '4', name: 'Potion', description: 'Heal 25 HP', stat: 'hp', amount: 25 },
  { id: '5', name: 'Iron', description: 'Increases Defense by 2', stat: 'defense', amount: 2 }, 
];

export const getRandomUpgrades = (count: number, playerId?: number, playerStatus?: string): Upgrade[] => {
  const currentPool = [...UPGRADES];
  if (playerId && EVOLUTION_MAP[playerId]) {
    currentPool.push({ id: 'evo_stone', name: 'Evolution Stone', description: 'Evolve into your next form!', stat: 'evolve', amount: 0 });
  }
  if (playerStatus && playerStatus !== 'normal') {
    currentPool.push({ id: 'full_heal', name: 'Full Heal', description: `Cures your ${playerStatus.toUpperCase()} status!`, stat: 'status', amount: 0 });
  }
  return currentPool.sort(() => 0.5 - Math.random()).slice(0, count);
};

export const scaleEnemyStats = (basePokemon: Pokemon, floor: number): Pokemon => {
  // 10% compounding stat growth per floor
  const multiplier = Math.pow(1.10, floor > 1 ? floor - 1 : 0);
  
  const newStats = { ...basePokemon.stats };
  
  // Apply the multiplier to all core stats
  newStats.maxHp = Math.max(1, Math.floor(newStats.maxHp * multiplier));
  newStats.hp = newStats.maxHp;
  newStats.attack = Math.max(1, Math.floor(newStats.attack * multiplier));
  newStats.defense = Math.max(1, Math.floor(newStats.defense * multiplier));
  newStats.speed = Math.max(1, Math.floor(newStats.speed * multiplier));
  
  return { ...basePokemon, level: floor, stats: newStats };
};

export const getEffectiveStat = (mon: Pokemon, stat: StatKey, modifier: DungeonModifier = 'none') => {
    const baseValue = mon.stats[stat];
    let flatBonus = 0; 

    if (mon.equipment && mon.equipment.length > 0) {
      mon.equipment.forEach(item => {
        if (item.statModifiers[stat]) {
          flatBonus += item.statModifiers[stat]!; 
        }
      });
    }

    let finalValue = baseValue + flatBonus;

    if (mon.stages && (stat === 'attack' || stat === 'defense' || stat === 'speed')) {
        finalValue = applyStatStage(finalValue, mon.stages[stat as StageStatKey]);
    }

    if (modifier === 'thick-fog' && stat === 'dodge') finalValue += 20; 
    
    return finalValue;
};