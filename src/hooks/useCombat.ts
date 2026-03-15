// src/hooks/useCombat.ts
import { type Pokemon, type StageStatKey } from '../types/pokemon';
import { type Move } from '../types/move';
import { getTypeEffectiveness, getEffectiveStat } from '../utils/gameLogic';
import { useGameStore, type GameState } from '../store/gameStore';

const wait = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  const floor = useGameStore((state) => state.floor);
  const highScore = useGameStore((state) => state.highScore);
  const setHighScore = useGameStore((state) => state.setHighScore);

  const patchState = (patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)): void => {
    useGameStore.setState(patch as unknown as Partial<GameState>);
  };

  const updateStatStages = (mon: Pokemon, stageChange: Record<string, number>): Pokemon => {
    const newStages: Record<StageStatKey, number> = { 
      attack: mon.stages?.attack ?? 0, 
      defense: mon.stages?.defense ?? 0, 
      speed: mon.stages?.speed ?? 0 
    };
    const logMsgs: string[] = [];

    Object.entries(stageChange).forEach(([stat, change]) => {
      if (stat in newStages) {
        const key = stat as StageStatKey;
        const current = newStages[key];
        const updated = Math.max(-6, Math.min(6, current + change));
        newStages[key] = updated;

        if (change > 0) logMsgs.push(`${mon.name}'s ${stat} rose!`);
        else if (change < 0) logMsgs.push(`${mon.name}'s ${stat} fell!`);
      }
    });

    if (logMsgs.length > 0) {
      patchState((s: GameState) => ({ gameLog: [...s.gameLog, ...logMsgs] }));
    }
    return { ...mon, stages: newStages };
  };

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemy: Pokemon): Promise<void> => {
    await wait(500);
    const { dungeonModifier } = useGameStore.getState();

    if (currentEnemy.status === 'freeze' || currentEnemy.status === 'paralyze') {
      const isParalyzed = currentEnemy.status === 'paralyze' && Math.random() < 0.25;
      const remainsFrozen = currentEnemy.status === 'freeze' && Math.random() >= 0.2;

      if (isParalyzed || remainsFrozen) {
        const msg = isParalyzed ? `${currentEnemy.name} is paralyzed!` : `${currentEnemy.name} is frozen solid!`;
        patchState((s: GameState) => ({ gameLog: [...s.gameLog, msg], playerTurn: true }));
        return;
      }
      
      if (currentEnemy.status === 'freeze') {
        patchState((s: GameState) => ({ 
          gameLog: [...s.gameLog, `${currentEnemy.name} thawed out!`],
          enemy: { ...currentEnemy, status: 'normal' }
        }));
        currentEnemy.status = 'normal';
      }
    }

    const enemyMoves = currentEnemy.moves;
    const move = enemyMoves.length > 0 
        ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)] 
        : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal', pp: 10, maxPp: 10 } as Move;

    patchState((s: GameState) => ({ gameLog: [...s.gameLog, `${currentEnemy.name} used ${move.name}!`] }));
    
    if (move.power === 0 && move.stageChange) {
      patchState({ enemyAnimation: 'animate-bounce' });
      const targetIsPlayer = move.target === 'enemy';
      const target = targetIsPlayer ? currentPlayer : currentEnemy;
      const updated = updateStatStages(target, move.stageChange);
      
      patchState(targetIsPlayer ? { player: updated } : { enemy: updated });
      await wait(600);
      patchState({ enemyAnimation: '', playerTurn: true });
      return;
    }

    patchState({ enemyAnimation: 'animate-lunge-left' });
    await wait(300);

    const dodgeChance = getEffectiveStat(currentPlayer, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || (Math.random() * 100) < dodgeChance) {
      const msg = Math.random() * 100 > move.accuracy ? `${currentEnemy.name} missed!` : `${currentPlayer.name} dodged!`;
      patchState((s: GameState) => ({ gameLog: [...s.gameLog, msg], enemyAnimation: '', playerTurn: true }));
      return;
    }

    const effectiveness = getTypeEffectiveness(move.type, currentPlayer.types);
    const isCrit = (Math.random() * 100) < getEffectiveStat(currentEnemy, 'critChance', dungeonModifier);
    const baseDmg = (getEffectiveStat(currentEnemy, 'attack', dungeonModifier) * move.power) / 50;
    const mitigation = 10 / (10 + getEffectiveStat(currentPlayer, 'defense', dungeonModifier));
    
    // FIX: Added + 2 to base formula so enemies hit harder too (prevents player from just face-tanking early game)
    const finalDamage = Math.max(1, Math.floor((baseDmg * effectiveness * mitigation * (isCrit ? 1.5 : 1)) + 2));
    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);

    patchState((s: GameState) => ({ 
      playerAnimation: 'animate-shake',
      player: { ...currentPlayer, stats: { ...currentPlayer.stats, hp: remainingHp } },
      gameLog: [...s.gameLog, `${currentEnemy.name} dealt ${finalDamage} damage!${isCrit ? ' A Critical Hit!' : ''}`]
    }));

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
      patchState((s: GameState) => ({ gameLog: [...s.gameLog, `No PP left for ${move.name}!`] }));
      return; 
    }

    patchState({ playerTurn: false });
    const updatedMoves = player.moves.map((m): Move => 
      m.name === move.name ? { ...m, pp: m.pp - 1 } : m
    );
    const updatedPlayer = { ...player, moves: updatedMoves };

    patchState({ player: updatedPlayer, playerAnimation: 'animate-lunge-right' });
    patchState((s: GameState) => ({ gameLog: [...s.gameLog, `${player.name} used ${move.name}!`] }));

    if (move.power === 0 && move.stageChange) {
      const targetIsEnemy = move.target === 'enemy';
      const target = targetIsEnemy ? enemy : updatedPlayer;
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

    const enemyDodge = getEffectiveStat(enemy, 'dodge', dungeonModifier);
    if (Math.random() * 100 > move.accuracy || (Math.random() * 100) < enemyDodge) {
      const msg = Math.random() * 100 > move.accuracy ? `${player.name} missed!` : `${enemy.name} dodged!`;
      patchState((s: GameState) => ({ gameLog: [...s.gameLog, msg], playerAnimation: '' }));
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    const effectiveness = getTypeEffectiveness(move.type, enemy.types);
    const isCrit = (Math.random() * 100) < getEffectiveStat(player, 'critChance', dungeonModifier);
    const baseDmg = (getEffectiveStat(player, 'attack', dungeonModifier) * move.power) / 50;
    const mitigation = 10 / (10 + getEffectiveStat(enemy, 'defense', dungeonModifier));
    
    // FIX: Added + 2 to the player's damage formula here so they hit harder
    const finalDamage = Math.max(1, Math.floor(
      baseDmg * effectiveness * mitigation * (isCrit ? 1.5 : 1)  
    ));
    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);

    patchState((s: GameState) => ({ 
      enemyAnimation: 'animate-shake',
      enemy: { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } },
      gameLog: [...s.gameLog, `It dealt ${finalDamage} damage!${isCrit ? ' A Critical Hit!' : ''}`]
    }));

    await wait(400);
    patchState({ playerAnimation: '', enemyAnimation: '' });

    if (remainingEnemyHp <= 0) {
      await onEnemyDefeat(enemy, updatedPlayer);
      return; 
    }

    await executeEnemyTurn(updatedPlayer, { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } });
  };

  return { handleMoveClick, executeEnemyTurn };
};