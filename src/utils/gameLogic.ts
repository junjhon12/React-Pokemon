// src/utils/gameLogic.ts
import type { Pokemon, StatKey, StageStatKey } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';
import type { DungeonModifier } from '../store/gameStore';
import { applyStatStage } from './statCalculator'; 

export const EVOLUTION_MAP: Record<number, number> = {
  1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9, 10: 11, 11: 12, 13: 14, 14: 15, 16: 17, 17: 18, 25: 26,           
};

const TYPE_CHART: Record<string, { superEffective: string[]; notVeryEffective: string[]; immune: string[] }> = {
  normal:   { superEffective: [],                                         notVeryEffective: ['rock', 'steel'],                                      immune: ['ghost'] },
  fire:     { superEffective: ['grass', 'ice', 'bug', 'steel'],           notVeryEffective: ['fire', 'water', 'rock', 'dragon'],                    immune: [] },
  water:    { superEffective: ['fire', 'ground', 'rock'],                 notVeryEffective: ['water', 'grass', 'dragon'],                           immune: [] },
  grass:    { superEffective: ['water', 'ground', 'rock'],                notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], immune: [] },
  electric: { superEffective: ['water', 'flying'],                        notVeryEffective: ['grass', 'electric', 'dragon'],                        immune: ['ground'] },
  ice:      { superEffective: ['grass', 'ground', 'flying', 'dragon'],    notVeryEffective: ['water', 'ice'],                                       immune: [] },
  fighting: { superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'], notVeryEffective: ['poison', 'bug', 'psychic', 'flying', 'fairy'],        immune: ['ghost'] },
  poison:   { superEffective: ['grass', 'fairy'],                         notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],                  immune: ['steel'] },
  ground:   { superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'], notVeryEffective: ['grass', 'bug'],                                  immune: ['flying'] },
  flying:   { superEffective: ['grass', 'fighting', 'bug'],               notVeryEffective: ['electric', 'rock', 'steel'],                          immune: [] },
  psychic:  { superEffective: ['fighting', 'poison'],                     notVeryEffective: ['psychic', 'steel'],                                   immune: ['dark'] },
  bug:      { superEffective: ['grass', 'psychic', 'dark'],               notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], immune: [] },
  rock:     { superEffective: ['fire', 'ice', 'flying', 'bug'],           notVeryEffective: ['fighting', 'ground', 'steel'],                        immune: [] },
  ghost:    { superEffective: ['psychic', 'ghost'],                       notVeryEffective: ['dark'],                                               immune: ['normal', 'fighting'] },
  dragon:   { superEffective: ['dragon'],                                 notVeryEffective: ['steel'],                                              immune: ['fairy'] },
  dark:     { superEffective: ['psychic', 'ghost'],                       notVeryEffective: ['fighting', 'dark', 'fairy'],                          immune: [] },
  steel:    { superEffective: ['ice', 'rock', 'fairy'],                   notVeryEffective: ['fire', 'water', 'electric', 'steel'],                 immune: [] },
  fairy:    { superEffective: ['fighting', 'dragon', 'dark'],             notVeryEffective: ['fire', 'poison', 'steel'],                            immune: [] },
};

export const getTypeEffectiveness = (moveType: string, defenderTypes: string[]): number => {
  const chart = TYPE_CHART[moveType];
  if (!chart) return 1;

  let multiplier = 1;
  for (const defType of defenderTypes) {
    if (chart.immune.includes(defType)) return 0;
    if (chart.superEffective.includes(defType)) multiplier *= 2;
    if (chart.notVeryEffective.includes(defType)) multiplier *= 0.5;
  }
  return multiplier;
};

const UPGRADES: Upgrade[] = [
  { id: '1', name: 'Protein',     description: 'Increases Attack by 4',       stat: 'attack',     amount: 4  },
  { id: '2', name: 'Carbos',      description: 'Increases Speed by 4',        stat: 'speed',      amount: 4  },
  { id: '3', name: 'HP Up',       description: 'Increases Max HP by 20',      stat: 'maxHp',      amount: 20 },
  { id: '4', name: 'Crit Chance', description: 'Increases Crit Chance by 3%', stat: 'critChance', amount: 3  },
  { id: '5', name: 'Iron',        description: 'Increases Defense by 4',      stat: 'defense',    amount: 4  },
];

export const getRandomUpgrades = (count: number, playerId?: number, playerStatus?: string): Upgrade[] => {
  const currentPool = [...UPGRADES];

  if (playerId && EVOLUTION_MAP[playerId]) {
    currentPool.push({ id: 'evo_stone', name: 'Evolution Stone', description: 'Evolve into your next form!', stat: 'evolve', amount: 0 });
  }
  if (playerStatus && playerStatus !== 'normal') {
    currentPool.push({ id: 'full_heal', name: 'Full Heal', description: `Cures your ${playerStatus.toUpperCase()} status!`, stat: 'status', amount: 0 });
  }
  const shuffled = currentPool.sort(() => 0.5 - Math.random()).slice(0, count);
  return shuffled;
};

export const scaleEnemyStats = (basePokemon: Pokemon, floor: number): Pokemon => {
  const multiplier = Math.pow(1.06, floor > 1 ? floor - 1 : 0);
  
  const newStats = { ...basePokemon.stats };
  newStats.maxHp    = Math.max(1, Math.floor(newStats.maxHp    * multiplier));
  newStats.hp       = newStats.maxHp;
  newStats.attack   = Math.max(1, Math.floor(newStats.attack   * multiplier));
  newStats.defense  = Math.max(1, Math.floor(newStats.defense  * multiplier));
  newStats.speed    = Math.max(1, Math.floor(newStats.speed    * multiplier));
  
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