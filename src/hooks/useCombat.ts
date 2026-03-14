// src/hooks/useCombat.ts
import { type Pokemon } from '../types/pokemon';
import type { Move } from '../types/move';
import { getTypeEffectiveness, getEffectiveStat } from '../utils/gameLogic';
import { useGameStore } from '../store/gameStore';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  // Atomic selectors for persistent values to minimize re-renders
  const floor = useGameStore(state => state.floor);
  const highScore = useGameStore(state => state.highScore);
  const setHighScore = useGameStore(state => state.setHighScore);

  /**
   * Optimization: Unified state patcher.
   * Instead of multiple small setState calls, we batch updates to trigger fewer renders.
   */
  const patchState = (patch: Partial<Parameters<typeof useGameStore.setState>[0]> | ((s: any) => any)) => {
    useGameStore.setState(patch as any);
  };

  /**
   * Logic Decoupled: Helper to update stat stages (-6 to +6 system).
   */
  const updateStatStages = (mon: Pokemon, stageChange: Record<string, number>): Pokemon => {
      const newStages = { ...(mon.stages || { attack: 0, defense: 0, speed: 0 }) };
      const logMsgs: string[] = [];

      Object.entries(stageChange).forEach(([stat, change]) => {
          const current = (newStages as any)[stat] || 0;
          const updated = Math.max(-6, Math.min(6, current + change));
          (newStages as any)[stat] = updated;

          if (change > 0) logMsgs.push(`${mon.name}'s ${stat} rose!`);
          else if (change < 0) logMsgs.push(`${mon.name}'s ${stat} fell!`);
      });

      if (logMsgs.length > 0) {
        patchState(s => ({ gameLog: [...s.gameLog, ...logMsgs] }));
      }
      return { ...mon, stages: newStages };
  };

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemy: Pokemon) => {
    await wait(500);
    const { dungeonModifier } = useGameStore.getState();

    // 1. Optimized Status Check
    if (currentEnemy.status === 'freeze' || currentEnemy.status === 'paralyze') {
      const isParalyzed = currentEnemy.status === 'paralyze' && Math.random() < 0.25;
      const remainsFrozen = currentEnemy.status === 'freeze' && Math.random() >= 0.2;

      if (isParalyzed || remainsFrozen) {
        const msg = isParalyzed ? `${currentEnemy.name} is paralyzed!` : `${currentEnemy.name} is frozen solid!`;
        patchState(s => ({ gameLog: [...s.gameLog, msg], playerTurn: true }));
        return;
      }
      
      if (currentEnemy.status === 'freeze') {
        patchState(s => ({ 
          gameLog: [...s.gameLog, `${currentEnemy.name} thawed out!`],
          enemy: { ...currentEnemy, status: 'normal' }
        }));
        currentEnemy.status = 'normal';
      }
    }

    const enemyMoves = currentEnemy.moves || [];
    const move = enemyMoves.length > 0 
        ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)] 
        : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

    patchState(s => ({ gameLog: [...s.gameLog, `${currentEnemy.name} used ${move.name}!`] }));
    
    // 2. Handle Support/Stat Moves
    if (move.power === 0 && (move as any).stageChange) {
        patchState({ enemyAnimation: 'animate-bounce' });
        const targetIsPlayer = (move as any).target === 'enemy';
        const target = targetIsPlayer ? currentPlayer : currentEnemy;
        const updated = updateStatStages(target, (move as any).stageChange);
        
        patchState(targetIsPlayer ? { player: updated } : { enemy: updated });
        await wait(600);
        patchState({ enemyAnimation: '', playerTurn: true });
        return;
    }

    patchState({ enemyAnimation: 'animate-lunge-left' });
    await wait(300);

    // 3. Accuracy and Dodge Logic (Using stage-aware getEffectiveStat)
    if (Math.random() * 100 > move.accuracy || (Math.random() * 100) < getEffectiveStat(currentPlayer, 'dodge', dungeonModifier)) {
      const msg = Math.random() * 100 > move.accuracy ? `${currentEnemy.name} missed!` : `${currentPlayer.name} dodged!`;
      patchState(s => ({ gameLog: [...s.gameLog, msg], enemyAnimation: '', playerTurn: true }));
      return;
    }

    // 4. Optimized Damage Calculation
    const effectiveness = getTypeEffectiveness(move.type, currentPlayer.types);
    const isCrit = (Math.random() * 100) < getEffectiveStat(currentEnemy, 'critChance', dungeonModifier);
    const baseDmg = (getEffectiveStat(currentEnemy, 'attack', dungeonModifier) * move.power) / 50;
    const mitigation = 10 / (10 + getEffectiveStat(currentPlayer, 'defense', dungeonModifier));
    
    const finalDamage = Math.max(1, Math.floor(baseDmg * effectiveness * mitigation * (isCrit ? 1.5 : 1)));
    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);

    patchState(s => ({ 
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

  const handleMoveClick = async (move: Move) => {
    const { player, enemy, playerTurn, dungeonModifier } = useGameStore.getState();
    if (!player || !enemy || !playerTurn) return;

    // PP Enforcement
    if (move.pp <= 0) {
      patchState(s => ({ gameLog: [...s.gameLog, `No PP left for ${move.name}!`] }));
      return; 
    }

    patchState({ playerTurn: false });
    let updatedPlayer = { ...player };
    
    // Deduct PP
    if (updatedPlayer.moves) {
        const idx = updatedPlayer.moves.findIndex(m => m.name === move.name);
        if (idx !== -1) updatedPlayer.moves[idx].pp -= 1;
    }

    // Player Status Check (Freeze/Paralyze)
    if (player.status === 'freeze' || player.status === 'paralyze') {
      const isParalyzed = player.status === 'paralyze' && Math.random() < 0.25;
      const remainsFrozen = player.status === 'freeze' && Math.random() >= 0.2;

      if (isParalyzed || remainsFrozen) {
        const msg = isParalyzed ? `${player.name} is paralyzed!` : `${player.name} is frozen solid!`;
        patchState(s => ({ gameLog: [...s.gameLog, msg] }));
        await executeEnemyTurn(updatedPlayer, enemy);
        return;
      }
      
      if (player.status === 'freeze') {
        patchState(s => ({ gameLog: [...s.gameLog, `${player.name} thawed out!`] }));
        updatedPlayer.status = 'normal';
      }
    }

    patchState({ player: updatedPlayer, playerAnimation: 'animate-lunge-right' });
    patchState(s => ({ gameLog: [...s.gameLog, `${player.name} used ${move.name}!`] }));

    // Handle Player Stat/Support moves
    if (move.power === 0 && (move as any).stageChange) {
        const targetIsEnemy = (move as any).target === 'enemy';
        const target = targetIsEnemy ? enemy : updatedPlayer;
        const updated = updateStatStages(target, (move as any).stageChange);
        
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

    // Accuracy and Enemy Dodge
    if (Math.random() * 100 > move.accuracy || (Math.random() * 100) < getEffectiveStat(enemy, 'dodge', dungeonModifier)) {
      const msg = Math.random() * 100 > move.accuracy ? `${player.name} missed!` : `${enemy.name} dodged!`;
      patchState(s => ({ gameLog: [...s.gameLog, msg] }));
      patchState({ playerAnimation: '' });
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    // Player Damage Calculation
    const effectiveness = getTypeEffectiveness(move.type, enemy.types);
    const isCrit = (Math.random() * 100) < getEffectiveStat(player, 'critChance', dungeonModifier);
    const baseDmg = (getEffectiveStat(player, 'attack', dungeonModifier) * move.power) / 50;
    const mitigation = 10 / (10 + getEffectiveStat(enemy, 'defense', dungeonModifier));
    
    const finalDamage = Math.max(1, Math.floor(baseDmg * effectiveness * mitigation * (isCrit ? 1.5 : 1)));
    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);

    patchState(s => ({ 
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