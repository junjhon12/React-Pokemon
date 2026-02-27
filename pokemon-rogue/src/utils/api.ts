import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { type Equipment } from '../types/equipment';

const POKE_API_URL = 'https://pokeapi.co/api/v2/pokemon/';

// Helper to fetch details for a single move
const fetchMoveDetails = async (url: string): Promise<Move | null> => {
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Only keep moves that actually deal damage or do something useful
    // (Filter out complex status moves for now to keep it simple)
    if (!data.power && data.meta?.category?.name !== 'ailment') return null;

    let moveStatus:any = null;
    const ailmentName = data.meta?.ailment?.name;
    if (['burn', 'poison', 'paralysis', 'freeze'].includes(ailmentName)) {
      moveStatus = ailmentName === 'paralysis' ? 'paralyze' : ailmentName;
    }

    return {
      name: data.name.replace('-', ' '), // "fire-punch" -> "fire punch"
      type: data.type.name,
      power: data.power || 0, // Status moves might be null, set to 0
      accuracy: data.accuracy || 100,
      pp: data.pp || 15,
      statusEffect: moveStatus,
    };
  } catch (e) {
    console.error("Error fetching move:", e);
    return null;
  }
};

export const getRandomPokemon = async (id: number): Promise<Pokemon> => {
  const response = await fetch(`${POKE_API_URL}${id}`);
  const data = await response.json();

  const hp = data.stats.find((s: any) => s.stat.name === 'hp').base_stat;
  const attack = data.stats.find((s: any) => s.stat.name === 'attack').base_stat;
  const speed = data.stats.find((s: any) => s.stat.name === 'speed').base_stat;

  // --- MOVE LOGIC ---
  const allMoves = data.moves;
  const shuffledMoves = allMoves.sort(() => 0.5 - Math.random()).slice(0, 10);
  const movePromises = shuffledMoves.map((m: any) => fetchMoveDetails(m.move.url));
  const resolvedMoves = await Promise.all(movePromises);
  const validMoves = resolvedMoves.filter((m): m is Move => m !== null).slice(0, 4);

  // RETURN THE NESTED OBJECT
  return {
    id: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    // This is the fix: Wrap these in a 'stats' object
    stats: {
      hp: hp,
      maxHp: hp,
      attack: attack,
      speed: speed,
    },
    isPlayer: false,
    moves: validMoves,
    level: 1, 
    types: data.types.map((t: any) => t.type.name),
    xp: 0,
    maxXp: 100,
    status: 'normal' // Added to match interface
  };
};

export const fetchEquipmentFromPokeAPI = async (itemName: string): Promise<Equipment | null> => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/item/${itemName}`);
    const data = await response.json();

    // Find the English description
    const englishEntry = data.flavor_text_entries.find((entry: any) => entry.language.name === 'en');
    const description = englishEntry ? englishEntry.flavor_text.replace(/\n/g, ' ') : 'A mysterious item.';

    // MAP SPECIFIC ITEMS TO ROGUELIKE STATS
    // Since PokeAPI items don't have explicit +10 Attack stats, we assign them here.
    let modifiers: Partial<Record<import('../types/pokemon').StatKey, number>> = {};
    
    switch(itemName) {
      case 'muscle-band': modifiers = { attack: 10 }; break;
      case 'iron-ball': modifiers = { defense: 15, speed: -10 }; break;
      case 'scope-lens': modifiers = { critChance: 15 }; break;
      case 'bright-powder': modifiers = { dodge: 10 }; break;
      case 'leftovers': modifiers = { maxHp: 20, hp: 20 }; break;
      default: modifiers = { attack: 1, defense: 1 }; // Fallback
    }

    // Return the data mapped exactly to OUR generic interface
    return {
      id: `pokeapi-${data.id}`,
      name: data.name.replace('-', ' '),
      description: description,
      spriteUrl: data.sprites.default,
      statModifiers: modifiers
    };

  } catch (error) {
    console.error("Error fetching item from PokeAPI:", error);
    return null;
  }
};