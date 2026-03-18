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
  name:        'Tackle',
  type:        'normal',
  power:       40,
  accuracy:    100,
  pp:          20,
  maxPp:       20,
  damageClass: 'physical',
};

const BANNED_ENEMY_MOVES = new Set(['last-resort', 'last resort']);

export const fetchMoveDetails = async (url: string, forEnemy = false): Promise<Move | null> => {
  try {
    const response = await fetch(url);
    const data     = await response.json();

    const moveName: string = data.name as string;

    if (forEnemy && BANNED_ENEMY_MOVES.has(moveName.toLowerCase())) return null;

    const categoryName: string = data.meta?.category?.name ?? '';
    const ailmentName: string  = data.meta?.ailment?.name  ?? '';
    const damageClass: Move['damageClass'] =
      (data.damage_class?.name as Move['damageClass']) ?? 'physical';

    const hasDamagingPower = data.power !== null && data.power !== undefined && data.power > 0;
    const isAilmentMove    = categoryName === 'ailment';
    const isDrainMove      = categoryName === 'damage+heal';
    const isLeechSeed      = ailmentName === 'leech-seed';

    if (!hasDamagingPower && !isAilmentMove && !isLeechSeed && !isDrainMove) return null;

    let moveStatus: Move['statusEffect'] | undefined;
    if (['burn', 'poison', 'paralysis', 'freeze', 'sleep'].includes(ailmentName)) {
      moveStatus = ailmentName === 'paralysis' ? 'paralyze' : ailmentName as Move['statusEffect'];
    }

    const drainPct: number = typeof data.meta?.drain === 'number' ? data.meta.drain : 0;
    const moveType: string = (data.type?.name ?? 'normal').toLowerCase();

    return {
      name:         moveName.replace(/-/g, ' '),
      type:         moveType,
      power:        data.power ?? 0,
      accuracy:     data.accuracy ?? 100,
      pp:           data.pp ?? 15,
      maxPp:        data.pp ?? 15,
      damageClass,
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

  const getStat = (name: string) =>
    data.stats.find((s: PokeAPIStat) => s.stat.name === name)?.base_stat ?? 50;

  const rawHp = getStat('hp');
  const hp    = isPlayer ? normalizePlayerStat(rawHp) * 8 : normalizeStat(rawHp) * 5;

  const norm = isPlayer ? normalizePlayerStat : normalizeStat;

  const attack         = norm(getStat('attack'));
  const defense        = norm(getStat('defense'));
  const specialAttack  = norm(getStat('special-attack'));
  const specialDefense = norm(getStat('special-defense'));
  const speed          = norm(getStat('speed'));

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
    // Prefer moves learned at levels 1-7 (starter's actual starting moves).
    // Falls back to earliest moves in full learnset if window is too narrow.
    const earlyMoves   = learnset.filter(m => m.level >= 1 && m.level <= 7);
    const startingPool = earlyMoves.length >= 2 ? earlyMoves : learnset;
    moveUrlsToFetch    = startingPool.slice(0, 4).map(m => m.url);
  } else {
    const availableMoves = learnset.filter((m: LearnsetMove) => m.level <= targetLevel);
    const recentMoves    = availableMoves.slice(-4);
    if (recentMoves.length === 0 && learnset.length > 0) {
      recentMoves.push(learnset[0]);
    }
    moveUrlsToFetch = recentMoves.map((m: LearnsetMove) => m.url);
  }

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
      maxHp:          hp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      speed,
      critChance:     5,
      dodge:          0,
    },
    isPlayer,
    moves:         validMoves,
    learnset,
    level:         1,
    types:         data.types.map((t: PokeAPIType) => t.type.name.toLowerCase()),
    xp:            0,
    maxXp:         50,
    status:        'normal',
    usedMoveNames: [],
  };
};

export const fetchEquipmentFromPokeAPI = async (itemName: string): Promise<Equipment | null> => {
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
      description:   customData.desc,
      spriteUrl:     data.sprites?.default
        ?? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      statModifiers: customData.stats,
    };
  } catch {
    return {
      id:            `local-${itemName}`,
      name:          customData.name,
      description:   customData.desc,
      spriteUrl:     'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
      statModifiers: customData.stats,
    };
  }
};

export const STARTER_CARDS = [
  { cardId: 'base1-44', dexId: 1,   name: 'Bulbasaur'  },
  { cardId: 'base1-46', dexId: 4,   name: 'Charmander' },
  { cardId: 'base1-63', dexId: 7,   name: 'Squirtle'   },
  { cardId: 'neo1-53',  dexId: 152, name: 'Chikorita'  },
  { cardId: 'neo1-56',  dexId: 155, name: 'Cyndaquil'  },
  { cardId: 'neo1-81',  dexId: 158, name: 'Totodile'   },
  { cardId: 'ex1-76',   dexId: 252, name: 'Treecko'    },
  { cardId: 'ex1-73',   dexId: 255, name: 'Torchic'    },
  { cardId: 'ex1-59',   dexId: 258, name: 'Mudkip'     },
] as const;

export const fetchPokemonCard = async () => {
  const results = await Promise.all(
    STARTER_CARDS.map(async (starter) => {
      try {
        const card = await tcgdex.fetch('cards', starter.cardId);
        if (card) return { ...card, dexId: [starter.dexId] };
      } catch {
        // individual card failure — fall through to artwork fallback
      }
      return {
        id:    `fallback-${starter.dexId}`,
        name:  starter.name,
        image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${starter.dexId}`,
        dexId: [starter.dexId],
      };
    })
  );
  return results.filter(Boolean);
};