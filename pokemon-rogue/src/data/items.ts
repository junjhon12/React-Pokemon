import { type StatKey } from '../types/pokemon';

export interface ItemData {
  name: string;
  desc: string;
  stats: Partial<Record<StatKey, number>>;
}

// Your master database of all custom items
export const CUSTOM_ITEM_DATA: Record<string, ItemData> = {
  'muscle-band': {
    name: 'Muscle Band',
    desc: 'A headband exuding pure fighting spirit. Grants a solid boost to physical damage.',
    stats: { attack: 15 }
  },
  'iron-ball': {
    name: 'Iron Ball',
    desc: 'An incredibly heavy sphere. Massively increases Defense, but severely lowers Speed.',
    stats: { defense: 25, speed: -15 }
  },
  'scope-lens': {
    name: 'Scope Lens',
    desc: 'A magnifying lens that highlights enemy weak points. Increases Critical Hit chance.',
    stats: { critChance: 15 }
  },
  'bright-powder': {
    name: 'Bright Powder',
    desc: 'A glittering powder that disorients attackers. Increases Dodge chance.',
    stats: { dodge: 12 }
  },
  'leftovers': {
    name: 'Leftovers',
    desc: 'Half-eaten food that fills you with determination. Grants a massive boost to Maximum Health.',
    stats: { maxHp: 30, hp: 30 }
  },
  'choice-scarf': {
    name: 'Choice Scarf',
    desc: 'A lightweight scarf woven with wind magic. Guarantees you strike first most of the time.',
    stats: { speed: 25 }
  },
  'life-orb': {
    name: 'Life Orb',
    desc: 'A cursed orb that grants immense, reckless power at the cost of your own vitality.',
    stats: { attack: 30, maxHp: -10 }
  },
  'assault-vest': {
    name: 'Assault Vest',
    desc: 'A heavy tactical vest. Turns the wearer into an absolute defensive juggernaut.',
    stats: { defense: 20 }
  }
  // You can keep adding as many items as you want down here!
};

// Automatically creates an array of all the item names (e.g., ['muscle-band', 'iron-ball', ...])
export const ITEM_POOL = Object.keys(CUSTOM_ITEM_DATA);