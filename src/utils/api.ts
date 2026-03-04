import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { type Equipment } from '../types/equipment';
import { CUSTOM_ITEM_DATA } from '../data/items';
import TCGdex from '@tcgdex/sdk';

const POKE_API_URL = 'https://pokeapi.co/api/v2/pokemon/';
const tcgdex = new TCGdex('en');

interface PokeAPIStat {
  base_stat: number;
  stat: { name: string };
}

interface PokeAPIMove {
  move: { url: string; name: string };
}

interface PokeAPIType {
  type: { name: string };
}

export const fetchMoveDetails = async (url: string): Promise<Move | null> => {
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.power && data.meta?.category?.name !== 'ailment') return null;

    let moveStatus: string | null = null;
    const ailmentName = data.meta?.ailment?.name;
    if (['burn', 'poison', 'paralysis', 'freeze'].includes(ailmentName)) {
      moveStatus = ailmentName === 'paralysis' ? 'paralyze' : ailmentName;
    }

    return {
      name: data.name.replace('-', ' '),
      type: data.type.name,
      power: data.power || 0, 
      accuracy: data.accuracy || 100,
      pp: data.pp || 15,
      statusEffect: moveStatus as "poison" | "burn" | "paralyze" | "freeze" | "stunned" | undefined,
    };
  } catch (e) {
    console.error("Error fetching move:", e);
    return null;
  }
};

// ADDED: targetLevel parameter to calculate valid enemy moves based on floor
export const getRandomPokemon = async (id: number, isPlayer: boolean = false, targetLevel: number = 1): Promise<Pokemon> => {
  const response = await fetch(`${POKE_API_URL}${id}`);
  const data = await response.json();

  const hp = data.stats.find((s: PokeAPIStat) => s.stat.name === 'hp').base_stat;
  const attack = data.stats.find((s: PokeAPIStat) => s.stat.name === 'attack').base_stat;
  const defense = data.stats.find((s: PokeAPIStat) => s.stat.name === 'defense').base_stat;
  const speed = data.stats.find((s: PokeAPIStat) => s.stat.name === 'speed').base_stat;

  // 1. Extract all moves learned via "level-up" for BOTH players and enemies
  const levelUpMoves = data.moves.map((m: any) => {
    const levelDetail = m.version_group_details.find((v: any) => v.move_learn_method.name === 'level-up');
    if (levelDetail) {
      return { level: levelDetail.level_learned_at, name: m.move.name, url: m.move.url };
    }
    return null;
  }).filter(Boolean);

  // 2. Remove duplicates (taking the earliest level learned)
  const uniqueMoves = new Map();
  levelUpMoves.forEach((m: any) => {
    if (!uniqueMoves.has(m.name) || uniqueMoves.get(m.name).level > m.level) {
      uniqueMoves.set(m.name, m);
    }
  });
  
  // Sort by level ascending
  const learnset = Array.from(uniqueMoves.values()).sort((a: any, b: any) => a.level - b.level);

  let moveUrlsToFetch: string[] = [];

  if (isPlayer) {
    // Start the player with the earliest moves (up to 3)
    moveUrlsToFetch = learnset.slice(0, 3).map((m: any) => m.url);
  } else {
    // Enemy gets up to 4 of the most recent moves they would have learned by their targetLevel
    const availableMoves = learnset.filter((m: any) => m.level <= targetLevel);
    const recentMoves = availableMoves.slice(-4);
    
    // Fallback: if somehow empty, just give them the very first move
    if (recentMoves.length === 0 && learnset.length > 0) {
       recentMoves.push(learnset[0]);
    }
    moveUrlsToFetch = recentMoves.map((m: any) => m.url);
  }

  const movePromises = moveUrlsToFetch.map(url => fetchMoveDetails(url));
  const resolved = await Promise.all(movePromises);
  const validMoves = resolved.filter((m): m is Move => m !== null);

  return {
    id: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    stats: {
      hp: hp,
      maxHp: hp,
      attack: attack,
      defense: defense,
      speed: speed,
      critChance: 5,
      dodge: 0,
    },
    isPlayer: isPlayer,
    moves: validMoves,
    learnset: learnset, 
    level: 1, 
    types: data.types.map((t: PokeAPIType) => t.type.name),
    xp: 0,
    maxXp: 100,
    status: 'normal'
  };
};

export const fetchEquipmentFromPokeAPI = async (itemName: string): Promise<Equipment | null> => {
  // ... existing code stays the same
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/item/${itemName}`);
    const data = await response.json();

    const customData = CUSTOM_ITEM_DATA[itemName];

    if (!customData) {
      console.warn(`Item ${itemName} not found in custom dictionary!`);
      return null;
    }

    return {
      id: `pokeapi-${data.id}`,
      name: customData.name,
      description: customData.desc,
      spriteUrl: data.sprites.default,
      statModifiers: customData.stats
    };

  } catch (error) {
    console.error("Error fetching item from PokeAPI:", error);
    return null;
  }
};

export const fetchPokemonCard = async () => {
  // ... existing code stays the same
  try {
    const bulbasaur = await tcgdex.fetch('cards', 'base1-44');
    const charmander = await tcgdex.fetch('cards', 'base1-46');
    const squirtle = await tcgdex.fetch('cards', 'base1-63');
    return [bulbasaur, charmander, squirtle].filter(Boolean);
  } catch (error) {
    console.error("Error fetching from TCGdex SDK:", error);
    return [];
  }
};