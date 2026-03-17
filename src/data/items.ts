// src/data/items.ts
import { type StatKey } from '../types/pokemon';

export interface ItemData {
  name: string;
  desc: string;
  stats: Partial<Record<StatKey, number>>;
}

export const CUSTOM_ITEM_DATA: Record<string, ItemData> = {
  // ── Physical offense ─────────────────────────────────────────────────────
  'muscle-band': {
    name: 'Muscle Band',
    desc: 'Boosts physical moves. Solid Attack increase.',
    stats: { attack: 15 },
  },
  'life-orb': {
    name: 'Life Orb',
    desc: 'Immense power at the cost of your own vitality.',
    stats: { attack: 20, specialAttack: 20, maxHp: -10 },
  },
  'choice-band': {
    name: 'Choice Band',
    desc: 'A tight band that sharply boosts Attack.',
    stats: { attack: 30 },
  },

  // ── Special offense ───────────────────────────────────────────────────────
  'wise-glasses': {
    name: 'Wise Glasses',
    desc: 'Thick glasses that boost special moves.',
    stats: { specialAttack: 15 },
  },
  'twisted-spoon': {
    name: 'Twisted Spoon',
    desc: 'A spoon imbued with psychic power. Boosts Sp. Atk greatly.',
    stats: { specialAttack: 25 },
  },
  'charcoal': {
    name: 'Charcoal',
    desc: 'Boosts the power of Fire-type special moves.',
    stats: { specialAttack: 18 },
  },
  'mystic-water': {
    name: 'Mystic Water',
    desc: 'A teardrop-shaped gem that boosts Water-type power.',
    stats: { specialAttack: 18 },
  },
  'miracle-seed': {
    name: 'Miracle Seed',
    desc: 'A seed that boosts the power of Grass-type moves.',
    stats: { specialAttack: 18 },
  },

  // ── Physical defense ──────────────────────────────────────────────────────
  'iron-ball': {
    name: 'Iron Ball',
    desc: 'Massively boosts Defense, but severely cuts Speed.',
    stats: { defense: 25, speed: -15 },
  },
  'assault-vest': {
    name: 'Assault Vest',
    desc: 'A tactical vest that raises Sp. Def and Defense.',
    stats: { defense: 15, specialDefense: 20 },
  },
  'rocky-helmet': {
    name: 'Rocky Helmet',
    desc: 'A jagged helmet that sharply raises Defense.',
    stats: { defense: 22 },
  },

  // ── Special defense ───────────────────────────────────────────────────────
  'sp-defense-band': {
    name: 'Sp. Def Band',
    desc: 'A specially-made band that sharply raises Sp. Def.',
    stats: { specialDefense: 22 },
  },
  'eviolite': {
    name: 'Eviolite',
    desc: 'Boosts both defenses for Pokémon that can still evolve.',
    stats: { defense: 12, specialDefense: 12 },
  },

  // ── Speed ─────────────────────────────────────────────────────────────────
  'choice-scarf': {
    name: 'Choice Scarf',
    desc: 'A scarf that sharply boosts Speed.',
    stats: { speed: 25 },
  },
  'quick-claw': {
    name: 'Quick Claw',
    desc: 'A claw that lets the holder move first more often.',
    stats: { speed: 18 },
  },

  // ── Crit / Dodge ──────────────────────────────────────────────────────────
  'scope-lens': {
    name: 'Scope Lens',
    desc: 'Highlights weak points. Raises Critical Hit chance.',
    stats: { critChance: 15 },
  },
  'bright-powder': {
    name: 'Bright Powder',
    desc: 'Glittering powder that raises Dodge chance.',
    stats: { dodge: 12 },
  },
  'razor-claw': {
    name: 'Razor Claw',
    desc: 'A sharp claw that greatly raises Critical Hit chance.',
    stats: { critChance: 22 },
  },

  // ── HP / Mixed ────────────────────────────────────────────────────────────
  'leftovers': {
    name: 'Leftovers',
    desc: 'Grants a large boost to Maximum HP.',
    stats: { maxHp: 30 },
  },
  'shell-bell': {
    name: 'Shell Bell',
    desc: 'Raises Max HP and boosts both defenses slightly.',
    stats: { maxHp: 20, defense: 6, specialDefense: 6 },
  },
  'expert-belt': {
    name: 'Expert Belt',
    desc: 'Raises all offensive stats for well-rounded damage.',
    stats: { attack: 10, specialAttack: 10 },
  },
};

export const ITEM_POOL = Object.keys(CUSTOM_ITEM_DATA);