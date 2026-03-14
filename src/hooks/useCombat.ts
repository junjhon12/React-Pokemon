// src/hooks/useCombat.ts
import { useCallback } from 'react';
import { type Pokemon } from '../types/pokemon';
import type { Move } from '../types/move';
import { getTypeEffectiveness, getEffectiveStat } from '../utils/gameLogic';
import { useGameStore } from '../store/gameStore';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  const { floor, highScore } = useGameStore();

  const setPlayer = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: Pokemon | null | ((e: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: boolean | ((t: boolean) => boolean)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: string[] | ((l: string[]) => string[])) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setPlayerAnimation = (val: string | ((a: string) => string)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerAnimation: val(s.playerAnimation) }) : { playerAnimation: val });
  const setEnemyAnimation = (val: string | ((a: string) => string)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemyAnimation: val(s.enemyAnimation) }) : { enemyAnimation: val });
  
  const setHighScore = useCallback((val: number) => {
     localStorage.setItem('rogue-score', val.toString());
     useGameStore.setState({ highScore: val });
  }, []);

  // NEW: Helper to update stat stages
  const updateStatStages = (mon: Pokemon, stageChange: Record<string, number>): Pokemon => {
      const newStages = { ...(mon.stages || { attack: 0, defense: 0, speed: 0 }) };
      let logMsgs: string[] = [];

      Object.entries(stageChange).forEach(([stat, change]) => {
          const current = (newStages as any)[stat] || 0;
          const updated = Math.max(-6, Math.min(6, current + change));
          (newStages as any)[stat] = updated;

          if (change > 0) logMsgs.push(`${mon.name}'s ${stat} rose!`);
          else if (change < 0) logMsgs.push(`${mon.name}'s ${stat} fell!`);
      });

      if (logMsgs.length > 0) setGameLog(prev => [...prev, ...logMsgs]);
      return { ...mon, stages: newStages };
  };

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemy: Pokemon) => {
    await wait(500);
    const { dungeonModifier } = useGameStore.getState();

    if (currentEnemy.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} thawed out!`]);
        setEnemy((e: Pokemon | null) => e ? { ...e, status: 'normal' } : null);
        currentEnemy.status = 'normal'; 
      } else {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} is frozen solid!`]);
        setPlayerTurn(true); return;
      }
    } else if (currentEnemy.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} is paralyzed! It can't move!`]);
      setPlayerTurn(true); return;
    }

    const enemyMoves = currentEnemy.moves || [];
    const randomMove = enemyMoves.length > 0 ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)] : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

    setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} used ${randomMove.name}!`]);
    
    // Check for Stat Stage moves
    if (randomMove.power === 0 && (randomMove as any).stageChange) {
        setEnemyAnimation('animate-bounce');
        const target = (randomMove as any).target === 'enemy' ? currentPlayer : currentEnemy;
        if (target === currentPlayer) {
            const updatedPlayer = updateStatStages(currentPlayer, (randomMove as any).stageChange);
            setPlayer(updatedPlayer);
        } else {
            const updatedEnemy = updateStatStages(currentEnemy, (randomMove as any).stageChange);
            setEnemy(updatedEnemy);
        }
        await wait(600); setEnemyAnimation(''); setPlayerTurn(true); return;
    }

    setEnemyAnimation('animate-lunge-left');
    await wait(300);

    if ((Math.random() * 100) < getEffectiveStat(currentPlayer, 'dodge', dungeonModifier)) {
      setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} dodged the attack!`]);
      setEnemyAnimation(''); setPlayerTurn(true); return;
    }

    const isCrit = (Math.random() * 100) < getEffectiveStat(currentEnemy, 'critChance', dungeonModifier);
    const effectiveness = getTypeEffectiveness(randomMove.type, currentPlayer.types);
    const stab = currentEnemy.types.includes(randomMove.type) ? 1.5 : 1;
    
    // NEW: Apply Dungeon Weather damage multipliers
    let weatherMultiplier = 1;
    if (dungeonModifier === 'volcanic' && randomMove.type === 'fire') weatherMultiplier = 1.5;
    if (dungeonModifier === 'electric-terrain' && randomMove.type === 'electric') weatherMultiplier = 1.5;

    // NEW: Check for Speed Advantage Double Strike
    const pSpeed = getEffectiveStat(currentPlayer, 'speed', dungeonModifier);
    const eSpeed = getEffectiveStat(currentEnemy, 'speed', dungeonModifier);
    let hits = 1;
    let isDoubleStrike = false;
    if (eSpeed >= pSpeed * 1.5 && Math.random() < 0.3) {
        hits = 2;
        isDoubleStrike = true;
    }

    const defenseMitigation = 10 / (10 + getEffectiveStat(currentPlayer, 'defense', dungeonModifier)); 
    const baseDamage = (getEffectiveStat(currentEnemy, 'attack', dungeonModifier) * randomMove.power) / 50;
    const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * (isCrit ? 1.5 : 1) * stab * weatherMultiplier * hits));

    setPlayerAnimation('animate-shake');
    
    let appliedStatus = currentPlayer.status; let statusLog = '';
    if (randomMove.statusEffect && (!currentPlayer.status || currentPlayer.status === 'normal') && (randomMove.power === 0 || Math.random() < 0.3)) {
      if (randomMove.statusEffect !== 'stunned') {
        appliedStatus = randomMove.statusEffect as any;
        statusLog = ` ${currentPlayer.name} was inflicted with ${randomMove.statusEffect}!`;
      }
    }

    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);
    let logMsg = `${currentEnemy.name} dealt ${finalDamage} damage!`;
    if (isDoubleStrike) logMsg += " DOUBLE STRIKE (Speed Advantage)!";
    if (isCrit) logMsg += " A Critical Hit!";
    if (effectiveness > 1) logMsg += " It's Super Effective!";
    if (stab > 1 && effectiveness <= 1) logMsg += " STAB applied!";
    if (weatherMultiplier > 1) logMsg += " Boosted by Weather!";
    if (statusLog) logMsg += statusLog;

    setPlayer((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingHp }, status: appliedStatus } : null);
    setGameLog((prev: string[]) => [...prev, logMsg]);

    await wait(400); setEnemyAnimation(''); setPlayerAnimation('');

    if (remainingHp <= 0) {
      if (floor > highScore) setHighScore(floor);
      return; 
    }
    setPlayerTurn(true);
  };

  const handleMoveClick = async (move: Move) => {
    const { player, enemy, playerTurn, dungeonModifier } = useGameStore.getState();
    if (!player || !enemy || !playerTurn) return;

    const hasAnyPP = player.moves?.some(m => m.pp > 0);
    let activeMove = move; let isStruggle = false;

    if (!hasAnyPP) {
      activeMove = { name: 'Struggle', type: 'normal', power: 50, accuracy: 100, pp: 1, maxPp: 1 } as Move;
      isStruggle = true;
      setGameLog((prev: string[]) => [...prev, `${player.name} has no PP left for any moves!`]);
    } else if (move.pp <= 0) {
      setGameLog((prev: string[]) => [...prev, `${player.name} has no PP left for ${move.name}!`]);
      return; 
    }

    setPlayerTurn(false);
    let updatedPlayer = { ...player };

    if (!isStruggle) {
      const moveIndex = updatedPlayer.moves?.findIndex(m => m.name === activeMove.name);
      if (moveIndex !== undefined && moveIndex !== -1 && updatedPlayer.moves) updatedPlayer.moves[moveIndex].pp -= 1;
    }

    if (player.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog((prev: string[]) => [...prev, `${player.name} thawed out!`]);
        updatedPlayer.status = 'normal'; setPlayer(updatedPlayer);
      } else {
        setGameLog((prev: string[]) => [...prev, `${player.name} is frozen solid!`]);
        await executeEnemyTurn(updatedPlayer, enemy); return;
      }
    } else if (player.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog((prev: string[]) => [...prev, `${player.name} is paralyzed! It can't move!`]);
      await executeEnemyTurn(updatedPlayer, enemy); return;
    }

    // Handle Stat Boosting Moves
    if (activeMove.power === 0 && (activeMove as any).stageChange) {
        setPlayerAnimation('animate-bounce');
        setGameLog(prev => [...prev, `${player.name} used ${activeMove.name}!`]);
        
        const target = (activeMove as any).target === 'enemy' ? enemy : updatedPlayer;
        if (target === enemy) {
            const updatedEnemy = updateStatStages(enemy, (activeMove as any).stageChange);
            setEnemy(updatedEnemy);
            await wait(600); setPlayerAnimation('');
            await executeEnemyTurn(updatedPlayer, updatedEnemy);
        } else {
            updatedPlayer = updateStatStages(updatedPlayer, (activeMove as any).stageChange);
            setPlayer(updatedPlayer);
            await wait(600); setPlayerAnimation('');
            await executeEnemyTurn(updatedPlayer, enemy);
        }
        return;
    }

    setPlayerAnimation('animate-lunge-right');
    setGameLog((prev: string[]) => [...prev, `${player.name} used ${activeMove.name}!`]);

    if (Math.random() * 100 > activeMove.accuracy) {
      await wait(300); setGameLog((prev: string[]) => [...prev, `${player.name} missed!`]);
      setPlayerAnimation(''); await executeEnemyTurn(updatedPlayer, enemy); return;
    }

    await wait(300);

    if ((Math.random() * 100) < getEffectiveStat(enemy, 'dodge', dungeonModifier)) {
      setGameLog((prev: string[]) => [...prev, `${enemy.name} dodged!`]);
      setPlayerAnimation(''); await executeEnemyTurn(updatedPlayer, enemy); return;
    }

    const isCrit = (Math.random() * 100) < getEffectiveStat(player, 'critChance', dungeonModifier);
    const effectiveness = getTypeEffectiveness(activeMove.type, enemy.types);
    const stab = player.types.includes(activeMove.type) ? 1.5 : 1;
    
    // NEW: Apply Dungeon Weather damage multipliers
    let weatherMultiplier = 1;
    if (dungeonModifier === 'volcanic' && activeMove.type === 'fire') weatherMultiplier = 1.5;
    if (dungeonModifier === 'electric-terrain' && activeMove.type === 'electric') weatherMultiplier = 1.5;

    // NEW: Check for Speed Advantage Double Strike
    const pSpeed = getEffectiveStat(player, 'speed', dungeonModifier);
    const eSpeed = getEffectiveStat(enemy, 'speed', dungeonModifier);
    let hits = 1;
    let isDoubleStrike = false;
    if (pSpeed >= eSpeed * 1.5 && Math.random() < 0.3) {
        hits = 2;
        isDoubleStrike = true;
    }

    const defenseMitigation = 10 / (10 + getEffectiveStat(enemy, 'defense', dungeonModifier)); 
    const baseDamage = (getEffectiveStat(player, 'attack', dungeonModifier) * activeMove.power) / 50;
    const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * (isCrit ? 1.5 : 1) * stab * weatherMultiplier * hits));

    setEnemyAnimation('animate-shake'); 
    
    let appliedStatus = enemy.status; let statusLog = '';
    if (activeMove.statusEffect && (!enemy.status || enemy.status === 'normal') && (activeMove.power === 0 || Math.random() < 0.3)) {
      if (activeMove.statusEffect !== 'stunned') {
        appliedStatus = activeMove.statusEffect as any;
        statusLog = ` ${enemy.name} was inflicted with ${activeMove.statusEffect}!`;
      }
    }

    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);
    let logMsg = `It dealt ${finalDamage} damage!`;
    if (isDoubleStrike) logMsg += " DOUBLE STRIKE (Speed Advantage)!";
    if (isCrit) logMsg += " A Critical Hit!";
    if (effectiveness > 1) logMsg += " It's Super Effective!";
    if (stab > 1 && effectiveness <= 1) logMsg += " STAB applied!";
    if (weatherMultiplier > 1) logMsg += " Boosted by Weather!";
    if (statusLog) logMsg += statusLog;

    if (isStruggle) {
       const recoil = Math.max(1, Math.floor(updatedPlayer.stats.maxHp * 0.25));
       updatedPlayer.stats.hp = Math.max(0, updatedPlayer.stats.hp - recoil);
       logMsg += ` ${player.name} took ${recoil} recoil damage!`;
    }

    // NEW: Hail Environmental Damage
    if (dungeonModifier === 'hail') {
        const hailDmg = Math.floor(updatedPlayer.stats.maxHp * 0.05);
        updatedPlayer.stats.hp = Math.max(0, updatedPlayer.stats.hp - hailDmg);
        logMsg += ` The Hail battered ${player.name} for ${hailDmg} damage!`;
    }

    if (updatedPlayer.status === 'burn' || updatedPlayer.status === 'poison') {
      const tickDamage = Math.max(1, Math.floor(updatedPlayer.stats.maxHp * 0.1));
      updatedPlayer.stats.hp = Math.max(updatedPlayer.stats.hp - tickDamage, 0);
      setPlayer(updatedPlayer);
      logMsg += ` ${player.name} took ${tickDamage} damage from ${player.status}!`;
    }

    if (updatedPlayer.stats.hp <= 0) {
      if (floor > highScore) setHighScore(floor);
      setGameLog((prev: string[]) => [...prev, logMsg]); return; 
    }

    setEnemy((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingEnemyHp }, status: appliedStatus } : null);
    setGameLog((prev: string[]) => [...prev, logMsg]);

    await wait(400); setPlayerAnimation(''); setEnemyAnimation('');

    if (remainingEnemyHp <= 0) {
      await onEnemyDefeat(enemy, updatedPlayer);
      return; 
    }

    const updatedEnemy = { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp }, status: appliedStatus };
    await executeEnemyTurn(updatedPlayer, updatedEnemy);
  };

  return { handleMoveClick, executeEnemyTurn };
};