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

// Fixed the parameter name to 'isPlayer' and implemented the learnset logic
export const getRandomPokemon = async (id: number, isPlayer: boolean = false): Promise<Pokemon> => {
  const response = await fetch(`${POKE_API_URL}${id}`);
  const data = await response.json();

  const hp = data.stats.find((s: PokeAPIStat) => s.stat.name === 'hp').base_stat;
  const attack = data.stats.find((s: PokeAPIStat) => s.stat.name === 'attack').base_stat;
  const defense = data.stats.find((s: PokeAPIStat) => s.stat.name === 'defense').base_stat;
  const speed = data.stats.find((s: PokeAPIStat) => s.stat.name === 'speed').base_stat;

  let validMoves: Move[] = [];
  let learnset: { level: number; name: string; url: string }[] = [];

  if (isPlayer) {
    // 1. Extract all moves learned via "level-up"
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
    learnset = Array.from(uniqueMoves.values()).sort((a: any, b: any) => a.level - b.level);

    // 3. Start the player with the earliest moves (up to 3)
    const initialMoveUrls = learnset.slice(0, 3).map((m: any) => m.url);
    const movePromises = initialMoveUrls.map(url => fetchMoveDetails(url));
    const resolved = await Promise.all(movePromises);
    validMoves = resolved.filter((m): m is Move => m !== null);

  } else {
    // Enemy behavior remains random for variety
    const shuffledMoves = data.moves.sort(() => 0.5 - Math.random()).slice(0, 10);
    const movePromises = shuffledMoves.map((m: any) => fetchMoveDetails(m.move.url));
    const resolvedMoves = await Promise.all(movePromises);
    validMoves = resolvedMoves.filter((m): m is Move => m !== null).slice(0, 4);
  }

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
    learnset: learnset, // Map the future roadmap of moves
    level: 1, 
    types: data.types.map((t: PokeAPIType) => t.type.name),
    xp: 0,
    maxXp: 100,
    status: 'normal'
  };
};

export const fetchEquipmentFromPokeAPI = async (itemName: string): Promise<Equipment | null> => {
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
  try {
    // The SDK makes it incredibly easy to request specific cards
    // base1-44 = Bulbasaur, base1-46 = Charmander, base1-63 = Squirtle
    const bulbasaur = await tcgdex.fetch('cards', 'base1-44');
    const charmander = await tcgdex.fetch('cards', 'base1-46');
    const squirtle = await tcgdex.fetch('cards', 'base1-63');

    // Return them in an array, filtering out any undefined results just in case
    return [bulbasaur, charmander, squirtle].filter(Boolean);
  } catch (error) {
    console.error("Error fetching from TCGdex SDK:", error);
    return [];
  }
};