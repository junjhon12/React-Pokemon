import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';

const POKE_API_URL = 'https://pokeapi.co/api/v2/pokemon/';

// Helper to fetch details for a single move
const fetchMoveDetails = async (url: string): Promise<Move | null> => {
  try {
    const response = await fetch(url);
    const data = await response.json();

    // Only keep moves that actually deal damage or do something useful
    // (Filter out complex status moves for now to keep it simple)
    if (!data.power && data.power !== 0) return null; 

    return {
      name: data.name.replace('-', ' '), // "fire-punch" -> "fire punch"
      type: data.type.name,
      power: data.power || 0, // Status moves might be null, set to 0
      accuracy: data.accuracy || 100,
      pp: data.pp || 15,
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

  // --- NEW MOVE LOGIC ---
  // 1. Get all moves (sometimes 100+)
  const allMoves = data.moves;

  // 2. Shuffle and pick random candidates
  // We pick more than 4 (e.g., 10) because some might fail our "fetchMoveDetails" check (like if they have no power)
  const shuffledMoves = allMoves.sort(() => 0.5 - Math.random()).slice(0, 10);

  // 3. Fetch details in parallel
  const movePromises = shuffledMoves.map((m: any) => fetchMoveDetails(m.move.url));
  const resolvedMoves = await Promise.all(movePromises);

  // 4. Filter out nulls and take the top 4
  const validMoves = resolvedMoves.filter((m): m is Move => m !== null).slice(0, 4);
  // ----------------------

  return {
    id: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    hp: hp,
    maxHp: hp,
    attack: attack,
    speed: speed,
    isPlayer: false,
    moves: validMoves, // Attach the real moves!
    level: 1, // Default level
    types: data.types.map((t: any) => t.type.name), // Get types for potential type advantages
    xp: 0,
    maxXp: 100, // XP needed to level up (can be adjusted based on level)
  };
};