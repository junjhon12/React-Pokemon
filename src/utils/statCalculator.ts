// Multipliers match the official Gen 3+ formula: neutral = 1×, max = 4×, min = 0.25×.
const STAGE_MULTIPLIERS: Record<number, number> = {
  '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
   '0': 1,
   '1': 1.5, '2': 2, '3': 2.5, '4': 3, '5': 3.5, '6': 4,
};

export const applyStatStage = (baseValue: number, stage: number = 0): number => {
  const safeStage = Math.max(-6, Math.min(6, stage));
  return Math.floor(baseValue * STAGE_MULTIPLIERS[safeStage]);
};