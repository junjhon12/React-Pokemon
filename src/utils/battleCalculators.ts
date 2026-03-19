import { type Pokemon } from '../types/pokemon';
import { type Move } from '../types/move';
import { type DungeonModifier } from '../store/gameStore';
import { getTypeEffectiveness, getEffectiveStat } from './gameLogic';

export interface BattleHitResult {
  damage: number;
  isCrit: boolean;
  effectiveness: number;
  stab: number;
  weatherMultiplier: number;
  hits: number;
  isDoubleStrike: boolean;
}

export const calculateBattleHit = (
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  modifier: DungeonModifier
): BattleHitResult => {
  const isCrit        = (Math.random() * 100) < getEffectiveStat(attacker, 'critChance', modifier);
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  const stab          = attacker.types.includes(move.type) ? 1.5 : 1;

  let weatherMultiplier = 1;
  if (modifier === 'volcanic'         && move.type === 'fire')     weatherMultiplier = 1.5;
  if (modifier === 'electric-terrain' && move.type === 'electric') weatherMultiplier = 1.5;

  const aSpeed = getEffectiveStat(attacker, 'speed', modifier);
  const dSpeed = getEffectiveStat(defender, 'speed', modifier);

  // Double-strike fires when the attacker is meaningfully faster — mirrors the
  // Gen 1 "Swift Swim doubles your hits" design intent without being too common.
  let hits           = 1;
  let isDoubleStrike = false;
  if (aSpeed >= dSpeed * 1.5 && Math.random() < 0.3) {
    hits           = 2;
    isDoubleStrike = true;
  }

  // Physical moves use Attack vs Defense; special moves use SpAtk vs SpDef.
  const isSpecial = move.damageClass === 'special';
  const atkStat   = isSpecial ? getEffectiveStat(attacker, 'specialAttack',  modifier)
                              : getEffectiveStat(attacker, 'attack',          modifier);
  const defStat   = isSpecial ? getEffectiveStat(defender, 'specialDefense', modifier)
                              : getEffectiveStat(defender, 'defense',         modifier);

  const defenseMitigation = 10 / (10 + defStat);
  const baseDamage        = (atkStat * move.power) / 50;

  const damage = Math.max(1, Math.floor(
    baseDamage * effectiveness * defenseMitigation
    * (isCrit ? 1.5 : 1) * stab * weatherMultiplier * hits
  ));

  return { damage, isCrit, effectiveness, stab, weatherMultiplier, hits, isDoubleStrike };
};