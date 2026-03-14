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
  return isSuperEffective ? 4 : 1;
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
    // FIX: Removed 'as StatKey' cast since 'status' is now a valid type
    currentPool.push({ id: 'full_heal', name: 'Full Heal', description: `Cures your ${playerStatus.toUpperCase()} status!`, stat: 'status', amount: 0 });
  }
  return currentPool.sort(() => 0.5 - Math.random()).slice(0, count);
};

export const scaleEnemyStats = (basePokemon: Pokemon, floor: number): Pokemon => {
  const levelUps = floor > 1 ? floor - 1 : 0;
  const newStats = { ...basePokemon.stats };
  const upgradeableStats: StatKey[] = ['maxHp', 'attack', 'defense', 'speed'];
  
  for (let i = 0; i < levelUps; i++) {
    const randomStat = upgradeableStats[Math.floor(Math.random() * upgradeableStats.length)];
    const increaseAmount = Math.floor(Math.random() * 2) + 1; 
    newStats[randomStat] += randomStat === 'maxHp' ? increaseAmount * 5 : increaseAmount;
  }
  newStats.hp = newStats.maxHp;
  return { ...basePokemon, level: floor, stats: newStats };
};

export const getEffectiveStat = (mon: Pokemon, stat: StatKey, modifier: DungeonModifier = 'none') => {
    const baseValue = mon.stats[stat];
    let percentBonus = 0; 

    if (mon.equipment && mon.equipment.length > 0) {
      mon.equipment.forEach(item => {
        if (item.statModifiers[stat]) {
          percentBonus += item.statModifiers[stat]!; 
        }
      });
    }

    let finalValue = baseValue * (1 + (percentBonus / 100));

    if (mon.stages && (stat === 'attack' || stat === 'defense' || stat === 'speed')) {
        finalValue = applyStatStage(finalValue, mon.stages[stat as StageStatKey]);
    }

    if (modifier === 'thick-fog' && stat === 'dodge') finalValue += 20; 
    
    return finalValue;
};