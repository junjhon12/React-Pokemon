// src/utils/api.ts
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

interface PokeAPIType {
  type: { name: string };
}

interface PokeAPIVersionGroupDetail {
  move_learn_method: { name: string };
  level_learned_at: number;
}

interface PokeAPIMoveEntry {
  move: { name: string; url: string };
  version_group_details: PokeAPIVersionGroupDetail[];
}

interface LearnsetMove {
  level: number;
  name: string;
  url: string;
}

const TACKLE_FALLBACK: Move = {
  name:     'Tackle',
  type:     'normal',
  power:    40,
  accuracy: 100,
  pp:       20,
  maxPp:    20,
};

// Moves that should never appear in enemy pools
const BANNED_ENEMY_MOVES = new Set(['last-resort', 'last resort']);

export const fetchMoveDetails = async (url: string, forEnemy = false): Promise<Move | null> => {
  try {
    const response = await fetch(url);
    const data     = await response.json();

    const moveName: string = data.name as string;

    // Ban Last Resort from enemy pools — its condition is never satisfied with small movesets
    if (forEnemy && BANNED_ENEMY_MOVES.has(moveName.toLowerCase())) return null;

    const categoryName: string = data.meta?.category?.name ?? '';
    const ailmentName: string  = data.meta?.ailment?.name  ?? '';

    const hasDamagingPower = data.power !== null && data.power !== undefined && data.power > 0;
    const isAilmentMove    = categoryName === 'ailment';
    const isDrainMove      = categoryName === 'damage+heal';
    const isLeechSeed      = ailmentName === 'leech-seed';

    // Discard moves that deal no damage AND have no meaningful effect we support
    if (!hasDamagingPower && !isAilmentMove && !isLeechSeed && !isDrainMove) return null;

    // Status effect mapping
    let moveStatus: Move['statusEffect'] | undefined;
    if (['burn', 'poison', 'paralysis', 'freeze', 'sleep'].includes(ailmentName)) {
      moveStatus = ailmentName === 'paralysis' ? 'paralyze' : ailmentName as Move['statusEffect'];
    }

    const drainPct: number = typeof data.meta?.drain === 'number' ? data.meta.drain : 0;

    // FIX: Always lowercase type to match TYPE_CHART keys
    const moveType: string = (data.type?.name ?? 'normal').toLowerCase();

    return {
      name:         moveName.replace(/-/g, ' '),
      type:         moveType,
      power:        data.power ?? 0,
      accuracy:     data.accuracy ?? 100,
      pp:           data.pp ?? 15,
      maxPp:        data.pp ?? 15,
      statusEffect: moveStatus,
      drain:        drainPct > 0 ? drainPct : undefined,
      leechSeed:    isLeechSeed ? true : undefined,
      isLastResort: moveName === 'last-resort' ? true : undefined,
    };
  } catch (e) {
    console.error('Error fetching move:', e);
    return null;
  }
};

export const getRandomPokemon = async (
  id: number,
  isPlayer: boolean = false,
  targetLevel: number = 1
): Promise<Pokemon> => {
  const response = await fetch(`${POKE_API_URL}${id}`);
  const data     = await response.json();

  const normalizeStat       = (base: number) => Math.max(1, Math.round(base / 10));
  const normalizePlayerStat = (base: number) => Math.max(1, Math.round(base / 7));

  const rawHp   = data.stats.find((s: PokeAPIStat) => s.stat.name === 'hp').base_stat;
  const hp      = isPlayer ? normalizePlayerStat(rawHp) * 8 : normalizeStat(rawHp) * 5;
  const attack  = isPlayer
    ? normalizePlayerStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'attack').base_stat)
    : normalizeStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'attack').base_stat);
  const defense = isPlayer
    ? normalizePlayerStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'defense').base_stat)
    : normalizeStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'defense').base_stat);
  const speed   = isPlayer
    ? normalizePlayerStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'speed').base_stat)
    : normalizeStat(data.stats.find((s: PokeAPIStat) => s.stat.name === 'speed').base_stat);

  const levelUpMoves = data.moves.map((m: PokeAPIMoveEntry) => {
    const levelDetail = m.version_group_details.find(
      (v: PokeAPIVersionGroupDetail) => v.move_learn_method.name === 'level-up'
    );
    if (levelDetail) {
      return { level: levelDetail.level_learned_at, name: m.move.name, url: m.move.url };
    }
    return null;
  }).filter((m: LearnsetMove | null): m is LearnsetMove => m !== null);

  const uniqueMoves = new Map<string, LearnsetMove>();
  levelUpMoves.forEach((m: LearnsetMove) => {
    const existing = uniqueMoves.get(m.name);
    if (!existing || existing.level > m.level) {
      uniqueMoves.set(m.name, m);
    }
  });

  const learnset = Array.from(uniqueMoves.values()).sort(
    (a: LearnsetMove, b: LearnsetMove) => a.level - b.level
  );

  let moveUrlsToFetch: string[] = [];

  if (isPlayer) {
    moveUrlsToFetch = learnset.slice(0, 3).map((m: LearnsetMove) => m.url);
  } else {
    const availableMoves = learnset.filter((m: LearnsetMove) => m.level <= targetLevel);
    const recentMoves    = availableMoves.slice(-4);
    if (recentMoves.length === 0 && learnset.length > 0) {
      recentMoves.push(learnset[0]);
    }
    moveUrlsToFetch = recentMoves.map((m: LearnsetMove) => m.url);
  }

  // FIX: Pass forEnemy so Last Resort is filtered from enemy move pools
  const movePromises = moveUrlsToFetch.map(url => fetchMoveDetails(url, !isPlayer));
  const resolved     = await Promise.all(movePromises);
  let validMoves     = resolved.filter((m): m is Move => m !== null);

  if (validMoves.length === 0) {
    validMoves = [{ ...TACKLE_FALLBACK }];
  }

  return {
    id:   data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    stats: {
      hp,
      maxHp:      hp,
      attack,
      defense,
      speed,
      critChance: 5,
      dodge:      0,
    },
    isPlayer,
    moves:   validMoves,
    learnset,
    level:   1,
    // FIX: Lowercase all types to match TYPE_CHART keys
    types:   data.types.map((t: PokeAPIType) => t.type.name.toLowerCase()),
    xp:      0,
    maxXp:   50,
    status:  'normal',
    usedMoveNames: [],
  };
};

export const fetchEquipmentFromPokeAPI = async (itemName: string): Promise<Equipment | null> => {
  // FIX: Use correct ItemData field names: desc (not description), stats (not statModifiers)
  const customData = CUSTOM_ITEM_DATA[itemName];

  if (!customData) {
    console.warn(`Item ${itemName} not found in custom item dictionary.`);
    return null;
  }

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/item/${itemName}`);
    if (!response.ok) throw new Error('Item not found');
    const data = await response.json();

    return {
      id:            `pokeapi-${data.id}`,
      name:          customData.name,
      description:   customData.desc,           // ItemData uses .desc
      spriteUrl:     data.sprites?.default
        ?? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      statModifiers: customData.stats,          // ItemData uses .stats
    };
  } catch {
    // Fall back to a sprite-less local entry if PokeAPI is unreachable
    return {
      id:            `local-${itemName}`,
      name:          customData.name,
      description:   customData.desc,           // ItemData uses .desc
      spriteUrl:     'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      statModifiers: customData.stats,          // ItemData uses .stats
    };
  }
};

export const fetchPokemonCard = async () => {
  try {
    const bulbasaur  = await tcgdex.fetch('cards', 'base1-44');
    const charmander = await tcgdex.fetch('cards', 'base1-46');
    const squirtle   = await tcgdex.fetch('cards', 'base1-63');
    return [bulbasaur, charmander, squirtle].filter(Boolean);
  } catch (error) {
    console.error('Error fetching from TCGdex SDK:', error);
    return [];
  }
};