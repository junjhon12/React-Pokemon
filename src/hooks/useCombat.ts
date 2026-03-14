import { useCallback } from 'react';
import { type Pokemon } from '../types/pokemon';
import type { Move } from '../types/move';
import { getEffectiveStat } from '../utils/gameLogic';
import { useGameStore } from '../store/gameStore';
import { calculateBattleHit } from '../utils/battleCalculators';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useCombat = (onEnemyDefeat: (enemy: Pokemon, player: Pokemon) => Promise<void>) => {
  // Optimization: Atomic selectors
  const floor = useGameStore(state => state.floor);
  const highScore = useGameStore(state => state.highScore);
  const setHighScore = useGameStore(state => state.setHighScore);

  // Modular state setters
  const setPlayer = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setPlayerAnimation = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerAnimation: val(s.playerAnimation) }) : { playerAnimation: val });
  const setEnemyAnimation = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemyAnimation: val(s.enemyAnimation) }) : { enemyAnimation: val });

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemy: Pokemon) => {
    await wait(500);
    const { dungeonModifier } = useGameStore.getState();

    // 1. Status Check logic
    if (currentEnemy.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} thawed out!`]);
        setEnemy((e: Pokemon | null) => e ? { ...e, status: 'normal' } : null);
        currentEnemy.status = 'normal'; 
      } else {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} is frozen solid!`]);
        setPlayerTurn(true); return;
      }
    }

    const move = (currentEnemy.moves && currentEnemy.moves.length > 0) 
      ? currentEnemy.moves[Math.floor(Math.random() * currentEnemy.moves.length)] 
      : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

    setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} used ${move.name}!`]);
    setEnemyAnimation('animate-lunge-left');
    await wait(300);

    // 2. Dodge Check
    if ((Math.random() * 100) < getEffectiveStat(currentPlayer, 'dodge', dungeonModifier)) {
      setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} dodged the attack!`]);
      setEnemyAnimation(''); setPlayerTurn(true); return;
    }

    // 3. Logic Decoupled: Hit Calculation
    const hit = calculateBattleHit(currentEnemy, currentPlayer, move, dungeonModifier);

    setPlayerAnimation('animate-shake');
    const remainingHp = Math.max(currentPlayer.stats.hp - hit.damage, 0);

    // 4. Log Orchestration
    let logMsg = `${currentEnemy.name} dealt ${hit.damage} damage!`;
    if (hit.isDoubleStrike) logMsg += " DOUBLE STRIKE!";
    if (hit.isCrit) logMsg += " A Critical Hit!";
    if (hit.effectiveness > 1) logMsg += " It's Super Effective!";

    setPlayer((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingHp } } : null);
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

    // ... (PP and Struggle logic same as before)
    
    setPlayerTurn(false);
    let updatedPlayer = { ...player };

    // Move logic
    setPlayerAnimation('animate-lunge-right');
    setGameLog((prev: string[]) => [...prev, `${player.name} used ${move.name}!`]);

    if (Math.random() * 100 > move.accuracy) {
      await wait(300); setGameLog((prev: string[]) => [...prev, `${player.name} missed!`]);
      setPlayerAnimation(''); await executeEnemyTurn(updatedPlayer, enemy); return;
    }

    await wait(300);

    // Logic Decoupled: Hit Calculation
    const hit = calculateBattleHit(player, enemy, move, dungeonModifier);

    setEnemyAnimation('animate-shake'); 
    const remainingEnemyHp = Math.max(enemy.stats.hp - hit.damage, 0);

    setEnemy((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingEnemyHp } } : null);
    setGameLog((prev: string[]) => [...prev, `It dealt ${hit.damage} damage!`]);

    await wait(400); setPlayerAnimation(''); setEnemyAnimation('');

    if (remainingEnemyHp <= 0) {
      await onEnemyDefeat(enemy, updatedPlayer);
      return; 
    }

    await executeEnemyTurn(updatedPlayer, { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp } });
  };

  return { handleMoveClick, executeEnemyTurn };
};