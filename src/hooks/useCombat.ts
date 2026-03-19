import { type Pokemon, type StageStatKey } from '../types/pokemon';
import { type Move } from '../types/move';
import { getEffectiveStat } from '../utils/gameLogic';
import { calculateBattleHit } from '../utils/battleCalculators';
import { getSmartMove } from '../utils/aiLogic';
import { useGameStore, type GameState } from '../store/gameStore';

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const MAX_LOG_ENTRIES = 100;

const appendLog = (s: GameState, ...messages: string[]): Partial<GameState> => ({
  gameLog: [...s.gameLog, ...messages].slice(-MAX_LOG_ENTRIES),
});

const TACKLE_FALLBACK: Move = {
  name: 'Tackle', power: 40, accuracy: 100, type: 'normal',
  pp: 10, maxPp: 10, damageClass: 'physical',
};

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  const floor        = useGameStore((state) => state.floor);
  const highScore    = useGameStore((state) => state.highScore);
  const setHighScore = useGameStore((state) => state.setHighScore);

  const patchState = (patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)): void => {
    useGameStore.setState(patch as unknown as Partial<GameState>);
  };

  const updateStatStages = (mon: Pokemon, stageChange: Record<string, number>): Pokemon => {
    const newStages: Record<StageStatKey, number> = {
      attack:         mon.stages?.attack         ?? 0,
      defense:        mon.stages?.defense        ?? 0,
      specialAttack:  mon.stages?.specialAttack  ?? 0,
      specialDefense: mon.stages?.specialDefense ?? 0,
      speed:          mon.stages?.speed          ?? 0,
    };
    const logMsgs: string[] = [];

    Object.entries(stageChange).forEach(([stat, change]) => {
      if (stat in newStages) {
        const key     = stat as StageStatKey;
        const updated = Math.max(-6, Math.min(6, newStages[key] + change));
        newStages[key] = updated;
        if (change > 0) logMsgs.push(`${mon.name}'s ${stat} rose!`);
        else if (change < 0) logMsgs.push(`${mon.name}'s ${stat} fell!`);
      }
    });

    if (logMsgs.length > 0) patchState((s: GameState) => appendLog(s, ...logMsgs));
    return { ...mon, stages: newStages };
  };

  // Drains 1/8 of the seeded Pokémon's max HP each turn and heals the other side.
  const applyLeechSeedTick = (
    seededMon: Pokemon,
    healer: Pokemon,
    seededLabel: 'player' | 'enemy'
  ): { seeded: Pokemon; healer: Pokemon } => {
    const drain    = Math.max(1, Math.floor(seededMon.stats.maxHp / 8));
    const newHp    = Math.max(0, seededMon.stats.hp - drain);
    const healedHp = Math.min(healer.stats.maxHp, healer.stats.hp + drain);

    patchState((s: GameState) => appendLog(
      s,
      `${seededMon.name}'s health was sapped by Leech Seed! (${drain} dmg)`,
      `${healer.name} recovered ${drain} HP from Leech Seed!`,
    ));

    const seededOut = { ...seededMon, stats: { ...seededMon.stats, hp: newHp    } };
    const healerOut = { ...healer,    stats: { ...healer.stats,    hp: healedHp } };

    if (seededLabel === 'player') patchState({ player: seededOut, enemy: healerOut });
    else                          patchState({ enemy:  seededOut, player: healerOut });

    return { seeded: seededOut, healer: healerOut };
  };

  const applyDrainHeal = (attacker: Pokemon, damage: number, drainPct: number, isPlayer: boolean): Pokemon => {
    const healAmount = Math.max(1, Math.floor(damage * drainPct / 100));
    const newHp      = Math.min(attacker.stats.maxHp, attacker.stats.hp + healAmount);
    const healed     = { ...attacker, stats: { ...attacker.stats, hp: newHp } };
    patchState((s: GameState) => appendLog(s, `${attacker.name} restored ${healAmount} HP!`));
    if (isPlayer) patchState({ player: healed });
    else          patchState({ enemy:  healed });
    return healed;
  };

  // Last Resort fails unless every other move in the current moveset has been
  // used at least once this battle — mirrors the actual game mechanic.
  const canUseMove = (mon: Pokemon, move: Move): boolean => {
    if (!move.isLastResort) return true;
    const otherMoves = mon.moves.filter(m => m.name !== move.name);
    const usedNames  = new Set(mon.usedMoveNames ?? []);
    return otherMoves.every(m => usedNames.has(m.name));
  };

  const recordMoveUsed = (mon: Pokemon, moveName: string): Pokemon => ({
    ...mon,
    usedMoveNames: Array.from(new Set([...(mon.usedMoveNames ?? []), moveName])),
  });

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemyArg: Pokemon): Promise<void> => {
    let currentEnemy = currentEnemyArg;

    await wait(500);
    const { dungeonModifier } = useGameStore.getState();
    const currentFloor        = useGameStore.getState().floor;
    const isBossFloor         = currentFloor % 10 === 0;
    const isMiniBoss          = currentFloor % 5  === 0 && !isBossFloor;

    if (currentEnemy.status === 'freeze' || currentEnemy.status === 'paralyze' || currentEnemy.status === 'sleep') {
      const isParalyzed   = currentEnemy.status === 'paralyze' && Math.random() < 0.25;
      const remainsFrozen = currentEnemy.status === 'freeze'   && Math.random() >= 0.2;
      const remainsAsleep = currentEnemy.status === 'sleep'    && Math.random() >= 0.33;

      if (isParalyzed || remainsFrozen || remainsAsleep) {
        const msg = isParalyzed   ? `${currentEnemy.name} is paralyzed and can't move!`
          : remainsFrozen         ? `${currentEnemy.name} is frozen solid!`
          :                         `${currentEnemy.name} is fast asleep!`;
        patchState((s: GameState) => ({ ...appendLog(s, msg), playerTurn: true }));
        return;
      }

      const wokeUp     = currentEnemy.status === 'sleep';
      const thawedOut  = currentEnemy.status === 'freeze';
      const woreOffMsg = wokeUp ? `${currentEnemy.name} woke up!` : `${currentEnemy.name} thawed out!`;
      patchState((s: GameState) => ({ ...appendLog(s, woreOffMsg), enemy: { ...currentEnemy, status: 'normal' } }));
      currentEnemy = { ...currentEnemy, status: 'normal' };
      // Paralysis only blocks the turn; it doesn't wear off until healed.
      if (!wokeUp && !thawedOut) { patchState({ playerTurn: true }); return; }
    }

    if (currentEnemy.status === 'burn' || currentEnemy.status === 'poison') {
      const tickDamage = Math.max(1, Math.floor(currentEnemy.stats.maxHp * 0.0625));
      const tickedHp   = Math.max(0, currentEnemy.stats.hp - tickDamage);
      patchState((s: GameState) => ({
        ...appendLog(s, `${currentEnemy.name} is hurt by its ${currentEnemy.status}! (${tickDamage} dmg)`),
        enemy: { ...currentEnemy, stats: { ...currentEnemy.stats, hp: tickedHp } },
      }));
      if (tickedHp <= 0) { await onEnemyDefeat(currentEnemy, currentPlayer); return; }
      currentEnemy = { ...currentEnemy, stats: { ...currentEnemy.stats, hp: tickedHp } };
    }

    if (currentEnemy.status === 'leech-seed') {
      const freshPlayer = useGameStore.getState().player ?? currentPlayer;
      const result      = applyLeechSeedTick(currentEnemy, freshPlayer, 'enemy');
      currentEnemy = result.seeded;
      if (currentEnemy.stats.hp <= 0) {
        await onEnemyDefeat(currentEnemy, useGameStore.getState().player ?? currentPlayer);
        return;
      }
    }

    let move: Move;
    if (isBossFloor) {
      move = getSmartMove(currentEnemy, currentPlayer);
    } else if (isMiniBoss) {
      const usable    = currentEnemy.moves.filter(m => m.pp > 0 && canUseMove(currentEnemy, m));
      const superEff  = usable.filter(m => m.power > 0 && calculateBattleHit(currentEnemy, currentPlayer, m, 'none').effectiveness > 1);
      move = superEff.length > 0
        ? superEff.sort((a, b) => (b.power || 0) - (a.power || 0))[0]
        : usable.length > 0
          ? usable[Math.floor(Math.random() * usable.length)]
          : TACKLE_FALLBACK;
    } else {
      const usable = currentEnemy.moves.filter(m => m.pp > 0 && canUseMove(currentEnemy, m));
      move = usable.length > 0 ? usable[Math.floor(Math.random() * usable.length)] : TACKLE_FALLBACK;
    }

    const updatedEnemyMoves = currentEnemy.moves.map((m): Move =>
      m.name === move.name ? { ...m, pp: Math.max(0, m.pp - 1) } : m
    );
    currentEnemy = recordMoveUsed({ ...currentEnemy, moves: updatedEnemyMoves }, move.name);
    patchState({ enemy: currentEnemy });
    patchState((s: GameState) => appendLog(s, `${currentEnemy.name} used ${move.name}!`));

    if (move.leechSeed) {
      patchState({ enemyAnimation: 'animate-bounce' });
      if (currentPlayer.status === 'normal') {
        const seededPlayer = { ...currentPlayer, status: 'leech-seed' as const };
        patchState((s: GameState) => ({ ...appendLog(s, `${currentPlayer.name} was seeded!`), player: seededPlayer, enemyAnimation: '', playerTurn: true }));
      } else {
        patchState((s: GameState) => ({ ...appendLog(s, `${currentPlayer.name} is already affected!`), enemyAnimation: '', playerTurn: true }));
      }
      return;
    }

    if (move.power === 0 && move.stageChange) {
      patchState({ enemyAnimation: 'animate-bounce' });
      const targetIsPlayer = move.target === 'enemy';
      const updated = updateStatStages(targetIsPlayer ? currentPlayer : currentEnemy, move.stageChange);
      patchState(targetIsPlayer ? { player: updated } : { enemy: updated });
      await wait(600);
      patchState({ enemyAnimation: '', playerTurn: true });
      return;
    }

    patchState({ enemyAnimation: 'animate-lunge-left' });
    await wait(300);

    const dodgeChance = getEffectiveStat(currentPlayer, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || Math.random() * 100 < dodgeChance) {
      const msg = Math.random() * 100 > move.accuracy ? `${currentEnemy.name} missed!` : `${currentPlayer.name} dodged!`;
      patchState((s: GameState) => ({ ...appendLog(s, msg), enemyAnimation: '', playerTurn: true }));
      return;
    }

    const hitResult   = calculateBattleHit(currentEnemy, currentPlayer, move, dungeonModifier);
    const finalDamage = hitResult.damage;
    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);

    const effectMsg = hitResult.effectiveness === 0 ? " It doesn't affect the player..."
      : hitResult.effectiveness >= 2 ? ' It\'s super effective!'
      : hitResult.effectiveness < 1  ? ' It\'s not very effective...' : '';
    const critMsg   = hitResult.isCrit        ? ' A Critical Hit!' : '';
    const doubleMsg = hitResult.isDoubleStrike ? ' It hit twice!'  : '';

    patchState((s: GameState) => ({
      ...appendLog(s, `${currentEnemy.name} dealt ${finalDamage} damage!${effectMsg}${critMsg}${doubleMsg}`),
      playerAnimation: 'animate-shake',
      player: { ...currentPlayer, stats: { ...currentPlayer.stats, hp: remainingHp } },
    }));

    if (move.drain && move.drain > 0 && finalDamage > 0) currentEnemy = applyDrainHeal(currentEnemy, finalDamage, move.drain, false);

    if (move.statusEffect && move.statusEffect !== 'stunned' && currentPlayer.status === 'normal' && hitResult.effectiveness > 0) {
      if (Math.random() < 0.3) {
        const s = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
        patchState((st: GameState) => ({ ...appendLog(st, `${currentPlayer.name} was inflicted with ${s}!`), player: { ...st.player!, status: s } }));
      }
    }

    await wait(400);
    patchState({ enemyAnimation: '', playerAnimation: '' });

    if (remainingHp <= 0) { if (floor > highScore) setHighScore(floor); return; }
    patchState({ playerTurn: true });
  };

  const handleMoveClick = async (move: Move): Promise<void> => {
    const { player, enemy, playerTurn, dungeonModifier } = useGameStore.getState();
    if (!player || !enemy || !playerTurn) return;

    if (move.pp <= 0) {
      patchState((s: GameState) => appendLog(s, `No PP left for ${move.name}!`));
      return;
    }

    if (!canUseMove(player, move)) {
      patchState((s: GameState) => appendLog(s, `But ${move.name} failed! Other moves haven't been used yet.`));
      return;
    }

    if (player.status === 'paralyze' && Math.random() < 0.25) {
      patchState((s: GameState) => appendLog(s, `${player.name} is paralyzed and can't move!`));
      await executeEnemyTurn(player, enemy); return;
    }
    if (player.status === 'sleep') {
      if (Math.random() >= 0.33) {
        patchState((s: GameState) => appendLog(s, `${player.name} is fast asleep!`));
        await executeEnemyTurn(player, enemy); return;
      }
      patchState((s: GameState) => ({ ...appendLog(s, `${player.name} woke up!`), player: { ...player, status: 'normal' } }));
    }
    if (player.status === 'freeze') {
      if (Math.random() >= 0.2) {
        patchState((s: GameState) => appendLog(s, `${player.name} is frozen solid!`));
        await executeEnemyTurn(player, enemy); return;
      }
      patchState((s: GameState) => ({ ...appendLog(s, `${player.name} thawed out!`), player: { ...player, status: 'normal' } }));
    }

    patchState({ playerTurn: false });

    const updatedMoves = player.moves.map((m): Move => m.name === move.name ? { ...m, pp: m.pp - 1 } : m);
    let updatedPlayer  = recordMoveUsed({ ...player, moves: updatedMoves }, move.name);

    patchState({ player: updatedPlayer, playerAnimation: 'animate-lunge-right' });
    patchState((s: GameState) => appendLog(s, `${player.name} used ${move.name}!`));

    if (move.leechSeed) {
      if (enemy.status === 'normal') {
        const seededEnemy = { ...enemy, status: 'leech-seed' as const };
        patchState((s: GameState) => ({ ...appendLog(s, `${enemy.name} was seeded!`), enemy: seededEnemy, playerAnimation: '' }));
        await wait(600);
        await executeEnemyTurn(updatedPlayer, seededEnemy);
      } else {
        patchState((s: GameState) => ({ ...appendLog(s, `${enemy.name} is already affected!`), playerAnimation: '' }));
        await executeEnemyTurn(updatedPlayer, enemy);
      }
      return;
    }

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
        updatedPlayer = updated;
        await wait(600);
        await executeEnemyTurn(updated, enemy);
      }
      return;
    }

    await wait(300);

    const enemyDodge = getEffectiveStat(enemy, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || Math.random() * 100 < enemyDodge) {
      const msg = Math.random() * 100 > move.accuracy ? `${player.name} missed!` : `${enemy.name} dodged!`;
      patchState((s: GameState) => ({ ...appendLog(s, msg), playerAnimation: '' }));
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    const hitResult        = calculateBattleHit(updatedPlayer, enemy, move, dungeonModifier);
    const finalDamage      = hitResult.damage;
    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);

    const effectMsg = hitResult.effectiveness === 0 ? " It doesn't affect them..."
      : hitResult.effectiveness >= 4 ? ' It\'s super effective!!'
      : hitResult.effectiveness >= 2 ? ' It\'s super effective!'
      : hitResult.effectiveness < 1  ? ' It\'s not very effective...' : '';
    const critMsg   = hitResult.isCrit        ? ' A Critical Hit!' : '';
    const doubleMsg = hitResult.isDoubleStrike ? ' It hit twice!'  : '';

    patchState((s: GameState) => ({
      ...appendLog(s, `It dealt ${finalDamage} damage!${effectMsg}${critMsg}${doubleMsg}`),
      enemyAnimation: 'animate-shake',
      enemy: { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } },
    }));

    if (move.drain && move.drain > 0 && finalDamage > 0) updatedPlayer = applyDrainHeal(updatedPlayer, finalDamage, move.drain, true);

    if (move.statusEffect && move.statusEffect !== 'stunned' && enemy.status === 'normal' && hitResult.effectiveness > 0) {
      if (Math.random() < 0.3) {
        const s = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze' | 'sleep';
        patchState((st: GameState) => ({ ...appendLog(st, `${enemy.name} was inflicted with ${s}!`), enemy: { ...st.enemy!, status: s } }));
      }
    }

    await wait(400);
    patchState({ playerAnimation: '', enemyAnimation: '' });

    if (remainingEnemyHp <= 0) { await onEnemyDefeat(enemy, updatedPlayer); return; }

    const playerAfterMove = useGameStore.getState().player;
    if (playerAfterMove && (playerAfterMove.status === 'burn' || playerAfterMove.status === 'poison')) {
      const tickDamage = Math.max(1, Math.floor(playerAfterMove.stats.maxHp * 0.0625));
      const tickedHp   = Math.max(0, playerAfterMove.stats.hp - tickDamage);
      patchState((s: GameState) => ({
        ...appendLog(s, `${playerAfterMove.name} is hurt by its ${playerAfterMove.status}! (${tickDamage} dmg)`),
        player: { ...playerAfterMove, stats: { ...playerAfterMove.stats, hp: tickedHp } },
      }));
      if (tickedHp <= 0) { if (floor > highScore) setHighScore(floor); return; }
    }

    const playerBeforeEnemyTurn = useGameStore.getState().player ?? updatedPlayer;
    const currentEnemy          = useGameStore.getState().enemy  ?? { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } };

    if (playerBeforeEnemyTurn.status === 'leech-seed') {
      const result = applyLeechSeedTick(playerBeforeEnemyTurn, currentEnemy, 'player');
      if (result.seeded.stats.hp <= 0) { if (floor > highScore) setHighScore(floor); return; }
    }

    await executeEnemyTurn(
      useGameStore.getState().player ?? updatedPlayer,
      useGameStore.getState().enemy  ?? { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } }
    );
  };

  return { handleMoveClick, executeEnemyTurn };
};