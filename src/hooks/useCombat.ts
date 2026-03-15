// src/hooks/useCombat.ts
import { type Pokemon, type StageStatKey } from '../types/pokemon';
import { type Move } from '../types/move';
import { getEffectiveStat } from '../utils/gameLogic';
import { calculateBattleHit } from '../utils/battleCalculators';
import { getSmartMove } from '../utils/aiLogic';
import { useGameStore, type GameState } from '../store/gameStore';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MAX_LOG_ENTRIES = 100;

const appendLog = (s: GameState, ...messages: string[]): Partial<GameState> => ({
  gameLog: [...s.gameLog, ...messages].slice(-MAX_LOG_ENTRIES),
});

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  const floor     = useGameStore((state) => state.floor);
  const highScore = useGameStore((state) => state.highScore);
  const setHighScore = useGameStore((state) => state.setHighScore);

  const patchState = (patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)): void => {
    useGameStore.setState(patch as unknown as Partial<GameState>);
  };

  const updateStatStages = (mon: Pokemon, stageChange: Record<string, number>): Pokemon => {
    const newStages: Record<StageStatKey, number> = {
      attack:  mon.stages?.attack  ?? 0,
      defense: mon.stages?.defense ?? 0,
      speed:   mon.stages?.speed   ?? 0,
    };
    const logMsgs: string[] = [];

    Object.entries(stageChange).forEach(([stat, change]) => {
      if (stat in newStages) {
        const key     = stat as StageStatKey;
        const current = newStages[key];
        const updated = Math.max(-6, Math.min(6, current + change));
        newStages[key] = updated;
        if (change > 0) logMsgs.push(`${mon.name}'s ${stat} rose!`);
        else if (change < 0) logMsgs.push(`${mon.name}'s ${stat} fell!`);
      }
    });

    if (logMsgs.length > 0) {
      patchState((s: GameState) => appendLog(s, ...logMsgs));
    }
    return { ...mon, stages: newStages };
  };

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemyArg: Pokemon): Promise<void> => {
    let currentEnemy = currentEnemyArg;

    await wait(500);
    const { dungeonModifier } = useGameStore.getState();
    const currentFloor  = useGameStore.getState().floor;
    const isBossFloor   = currentFloor % 10 === 0;
    const isMiniBoss    = currentFloor % 5 === 0 && !isBossFloor;

    // --- Freeze / Paralyze / Sleep check ---
    if (
      currentEnemy.status === 'freeze'   ||
      currentEnemy.status === 'paralyze' ||
      currentEnemy.status === 'sleep'
    ) {
      const isParalyzed   = currentEnemy.status === 'paralyze' && Math.random() < 0.25;
      const remainsFrozen = currentEnemy.status === 'freeze'   && Math.random() >= 0.2;
      const remainsAsleep = currentEnemy.status === 'sleep'    && Math.random() >= 0.33;

      if (isParalyzed || remainsFrozen || remainsAsleep) {
        const msg = isParalyzed  ? `${currentEnemy.name} is paralyzed and can't move!`
          : remainsFrozen        ? `${currentEnemy.name} is frozen solid!`
          : `${currentEnemy.name} is fast asleep!`;
        patchState((s: GameState) => ({ ...appendLog(s, msg), playerTurn: true }));
        return;
      }

      // Status wore off
      const wokeUp   = currentEnemy.status === 'sleep';
      const thawedOut = currentEnemy.status === 'freeze';
      const woreOffMsg = wokeUp ? `${currentEnemy.name} woke up!` : `${currentEnemy.name} thawed out!`;
      patchState((s: GameState) => ({
        ...appendLog(s, woreOffMsg),
        enemy: { ...currentEnemy, status: 'normal' },
      }));
      currentEnemy = { ...currentEnemy, status: 'normal' };
      // Paralysis doesn't wear off on its own — only blocks the turn
      if (!wokeUp && !thawedOut) {
        // Paralysis blocked this turn, player goes next
        patchState({ playerTurn: true });
        return;
      }
    }

    // --- Burn / Poison tick ---
    if (currentEnemy.status === 'burn' || currentEnemy.status === 'poison') {
      const tickDamage = Math.max(1, Math.floor(currentEnemy.stats.maxHp * 0.0625));
      const tickedHp   = Math.max(0, currentEnemy.stats.hp - tickDamage);
      patchState((s: GameState) => ({
        ...appendLog(s, `${currentEnemy.name} is hurt by its ${currentEnemy.status}! (${tickDamage} dmg)`),
        enemy: { ...currentEnemy, stats: { ...currentEnemy.stats, hp: tickedHp } },
      }));
      if (tickedHp <= 0) {
        await onEnemyDefeat(currentEnemy, currentPlayer);
        return;
      }
      currentEnemy = { ...currentEnemy, stats: { ...currentEnemy.stats, hp: tickedHp } };
    }

    // --- Pick move: smart for bosses and mini-bosses, random otherwise ---
    let move: Move;
    if (isBossFloor) {
      move = getSmartMove(currentEnemy, currentPlayer);
    } else if (isMiniBoss) {
      // Mini-bosses only use the type effectiveness check, not support logic
      const usableMoves = currentEnemy.moves.filter(m => m.pp > 0);
      const superEffective = usableMoves.filter(
        m => m.power > 0 && (calculateBattleHit(currentEnemy, currentPlayer, m, 'none').effectiveness > 1)
      );
      move = superEffective.length > 0
        ? superEffective.sort((a, b) => (b.power || 0) - (a.power || 0))[0]
        : usableMoves.length > 0
          ? usableMoves[Math.floor(Math.random() * usableMoves.length)]
          : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal', pp: 10, maxPp: 10 } as Move;
    } else {
      move = currentEnemy.moves.length > 0
        ? currentEnemy.moves[Math.floor(Math.random() * currentEnemy.moves.length)]
        : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal', pp: 10, maxPp: 10 } as Move;
    }

    patchState((s: GameState) => appendLog(s, `${currentEnemy.name} used ${move.name}!`));

    // --- Stat-change move ---
    if (move.power === 0 && move.stageChange) {
      patchState({ enemyAnimation: 'animate-bounce' });
      const targetIsPlayer = move.target === 'enemy';
      const target  = targetIsPlayer ? currentPlayer : currentEnemy;
      const updated = updateStatStages(target, move.stageChange);
      patchState(targetIsPlayer ? { player: updated } : { enemy: updated });
      await wait(600);
      patchState({ enemyAnimation: '', playerTurn: true });
      return;
    }

    patchState({ enemyAnimation: 'animate-lunge-left' });
    await wait(300);

    // --- Accuracy / dodge check ---
    const dodgeChance = getEffectiveStat(currentPlayer, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || Math.random() * 100 < dodgeChance) {
      const msg = Math.random() * 100 > move.accuracy
        ? `${currentEnemy.name} missed!`
        : `${currentPlayer.name} dodged!`;
      patchState((s: GameState) => ({ ...appendLog(s, msg), enemyAnimation: '', playerTurn: true }));
      return;
    }

    // --- Damage ---
    const hitResult   = calculateBattleHit(currentEnemy, currentPlayer, move, dungeonModifier);
    const finalDamage = hitResult.damage;
    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);

    const effectivenessMsg = hitResult.effectiveness === 0 ? " It doesn't affect the player..."
      : hitResult.effectiveness >= 2 ? ' It\'s super effective!'
      : hitResult.effectiveness < 1  ? ' It\'s not very effective...'
      : '';
    const critMsg   = hitResult.isCrit        ? ' A Critical Hit!' : '';
    const doubleMsg = hitResult.isDoubleStrike ? ' It hit twice!'  : '';

    patchState((s: GameState) => ({
      ...appendLog(s, `${currentEnemy.name} dealt ${finalDamage} damage!${effectivenessMsg}${critMsg}${doubleMsg}`),
      playerAnimation: 'animate-shake',
      player: { ...currentPlayer, stats: { ...currentPlayer.stats, hp: remainingHp } },
    }));

    // --- Status application ---
    if (move.statusEffect && move.statusEffect !== 'stunned' && currentPlayer.status === 'normal' && hitResult.effectiveness > 0) {
      if (Math.random() < 0.3) {
        const statusToApply = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
        patchState((s: GameState) => ({
          ...appendLog(s, `${currentPlayer.name} was inflicted with ${statusToApply}!`),
          player: { ...s.player!, status: statusToApply },
        }));
      }
    }

    await wait(400);
    patchState({ enemyAnimation: '', playerAnimation: '' });

    if (remainingHp <= 0) {
      if (floor > highScore) setHighScore(floor);
      return;
    }
    patchState({ playerTurn: true });
  };

  const handleMoveClick = async (move: Move): Promise<void> => {
    const { player, enemy, playerTurn, dungeonModifier } = useGameStore.getState();
    if (!player || !enemy || !playerTurn) return;

    if (move.pp <= 0) {
      patchState((s: GameState) => appendLog(s, `No PP left for ${move.name}!`));
      return;
    }

    // --- Player status check ---
    if (player.status === 'paralyze' && Math.random() < 0.25) {
      patchState((s: GameState) => appendLog(s, `${player.name} is paralyzed and can't move!`));
      await executeEnemyTurn(player, enemy);
      return;
    }
    if (player.status === 'sleep') {
      if (Math.random() >= 0.33) {
        patchState((s: GameState) => appendLog(s, `${player.name} is fast asleep!`));
        await executeEnemyTurn(player, enemy);
        return;
      }
      // Woke up — update state and continue
      patchState((s: GameState) => ({
        ...appendLog(s, `${player.name} woke up!`),
        player: { ...player, status: 'normal' },
      }));
    }
    if (player.status === 'freeze') {
      if (Math.random() >= 0.2) {
        patchState((s: GameState) => appendLog(s, `${player.name} is frozen solid!`));
        await executeEnemyTurn(player, enemy);
        return;
      }
      patchState((s: GameState) => ({
        ...appendLog(s, `${player.name} thawed out!`),
        player: { ...player, status: 'normal' },
      }));
    }

    patchState({ playerTurn: false });

    const updatedMoves  = player.moves.map((m): Move => m.name === move.name ? { ...m, pp: m.pp - 1 } : m);
    const updatedPlayer = { ...player, moves: updatedMoves };

    patchState({ player: updatedPlayer, playerAnimation: 'animate-lunge-right' });
    patchState((s: GameState) => appendLog(s, `${player.name} used ${move.name}!`));

    // --- Stat-change move ---
    if (move.power === 0 && move.stageChange) {
      const targetIsEnemy = move.target === 'enemy';
      const target  = targetIsEnemy ? enemy : updatedPlayer;
      const updated = updateStatStages(target, move.stageChange);
      if (targetIsEnemy) {
        patchState({ enemy: updated });
        await wait(600);
        await executeEnemyTurn(updatedPlayer, updated);
      } else {
        patchState({ player: updated });
        await wait(600);
        await executeEnemyTurn(updated, enemy);
      }
      return;
    }

    await wait(300);

    // --- Accuracy / dodge check ---
    const enemyDodge = getEffectiveStat(enemy, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || Math.random() * 100 < enemyDodge) {
      const msg = Math.random() * 100 > move.accuracy
        ? `${player.name} missed!`
        : `${enemy.name} dodged!`;
      patchState((s: GameState) => ({ ...appendLog(s, msg), playerAnimation: '' }));
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    // --- Damage ---
    const hitResult       = calculateBattleHit(updatedPlayer, enemy, move, dungeonModifier);
    const finalDamage     = hitResult.damage;
    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);

    const effectivenessMsg = hitResult.effectiveness === 0 ? " It doesn't affect them..."
      : hitResult.effectiveness >= 4 ? ' It\'s super effective!!'
      : hitResult.effectiveness >= 2 ? ' It\'s super effective!'
      : hitResult.effectiveness < 1  ? ' It\'s not very effective...'
      : '';
    const critMsg   = hitResult.isCrit        ? ' A Critical Hit!' : '';
    const doubleMsg = hitResult.isDoubleStrike ? ' It hit twice!'  : '';

    patchState((s: GameState) => ({
      ...appendLog(s, `It dealt ${finalDamage} damage!${effectivenessMsg}${critMsg}${doubleMsg}`),
      enemyAnimation: 'animate-shake',
      enemy: { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } },
    }));

    // --- Status application ---
    if (move.statusEffect && move.statusEffect !== 'stunned' && enemy.status === 'normal' && hitResult.effectiveness > 0) {
      if (Math.random() < 0.3) {
        const statusToApply = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
        patchState((s: GameState) => ({
          ...appendLog(s, `${enemy.name} was inflicted with ${statusToApply}!`),
          enemy: { ...s.enemy!, status: statusToApply },
        }));
      }
    }

    await wait(400);
    patchState({ playerAnimation: '', enemyAnimation: '' });

    if (remainingEnemyHp <= 0) {
      await onEnemyDefeat(enemy, updatedPlayer);
      return;
    }

    // --- Burn / Poison tick on player before enemy acts ---
    const playerAfterMove = useGameStore.getState().player;
    if (playerAfterMove && (playerAfterMove.status === 'burn' || playerAfterMove.status === 'poison')) {
      const tickDamage = Math.max(1, Math.floor(playerAfterMove.stats.maxHp * 0.0625));
      const tickedHp   = Math.max(0, playerAfterMove.stats.hp - tickDamage);
      patchState((s: GameState) => ({
        ...appendLog(s, `${playerAfterMove.name} is hurt by its ${playerAfterMove.status}! (${tickDamage} dmg)`),
        player: { ...playerAfterMove, stats: { ...playerAfterMove.stats, hp: tickedHp } },
      }));
      if (tickedHp <= 0) {
        if (floor > highScore) setHighScore(floor);
        return;
      }
    }

    await executeEnemyTurn(
      useGameStore.getState().player ?? updatedPlayer,
      { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } }
    );
  };

  return { handleMoveClick, executeEnemyTurn };
};