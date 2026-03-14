/**
 * Pokémon Stat Stage Multipliers
 * Stages range from -6 to +6. 
 * Neutral (0) is 1x. +6 is 4x. -6 is 0.25x.
 */
const STAGE_MULTIPLIERS: Record<number, number> = {
  '-6': 2/8,
  '-5': 2/7,
  '-4': 2/6,
  '-3': 2/5,
  '-2': 2/4,
  '-1': 2/3,
  '0': 1,
  '1': 1.5,
  '2': 2,
  '3': 2.5,
  '4': 3,
  '5': 3.5,
  '6': 4
};

/**
 * Calculates a stat after applying temporary battle stages.
 * @param baseValue The stat after level and equipment calculations.
 * @param stage The current stage (-6 to 6).
 */
export const applyStatStage = (baseValue: number, stage: number = 0): number => {
  const safeStage = Math.max(-6, Math.min(6, stage));
  return Math.floor(baseValue * STAGE_MULTIPLIERS[safeStage]);
};