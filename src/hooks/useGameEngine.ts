import { useCallback } from 'react';
import { type Pokemon, type StatKey } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';
import { getRandomPokemon, fetchEquipmentFromPokeAPI, fetchMoveDetails } from '../utils/api'; 
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP, getEffectiveStat } from '../utils/gameLogic';
import { ITEM_POOL } from '../data/items';
import { useGameStore } from '../store/gameStore';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useGameEngine = () => {
  const {
    player, enemy, playerTurn, floor, highScore
  } = useGameStore();

  const setPlayer = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: Pokemon | null | ((e: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: boolean | ((t: boolean) => boolean)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: string[] | ((l: string[]) => string[])) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setFloor = (val: number | ((f: number) => number)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ floor: val(s.floor) }) : { floor: val });
  const setUpgrades = (val: Upgrade[] | ((u: Upgrade[]) => Upgrade[])) => useGameStore.setState(typeof val === 'function' ? (s) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });
  const setPlayerAnimation = (val: string | ((a: string) => string)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerAnimation: val(s.playerAnimation) }) : { playerAnimation: val });
  const setEnemyAnimation = (val: string | ((a: string) => string)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemyAnimation: val(s.enemyAnimation) }) : { enemyAnimation: val });
  const setIsGameStarted = (val: 'START' | 'SELECT' | 'BATTLE') => useGameStore.setState({ isGameStarted: val });
  
  const setHighScore = useCallback((val: number | ((s: number) => number)) => {
     const newScore = typeof val === 'function' ? val(highScore) : val;
     localStorage.setItem('rogue-score', newScore.toString());
     useGameStore.setState({ highScore: newScore });
  }, [highScore]);

  function handleLevelUp(currentStats: Pokemon, overflowXp: number) {
      const newLevel = (currentStats.level || 1) + 1;
      const growthRate = 0.1; 
      const newMaxHp = Math.floor(currentStats.stats.maxHp * (1 + growthRate));
      const newAttack = Math.floor(currentStats.stats.attack * (1 + growthRate));
      const newSpeed = Math.floor(currentStats.stats.speed * (1 + growthRate));
      const newMaxXp = Math.floor((currentStats.maxXp || 100) * 1.2);

      return {
        ...currentStats,
        level: newLevel,
        stats: {
          ...currentStats.stats,
          maxHp: newMaxHp,
          hp: newMaxHp,
          attack: newAttack,
          speed: newSpeed
        },
        xp: overflowXp,
        maxXp: newMaxXp
      };
  }

  const startGame = () => setIsGameStarted('SELECT');

  const selectStarterAndStart = async (starterId: number) => {
    setFloor(1);
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    const [p1, p2] = await Promise.all([
      getRandomPokemon(starterId, true), // <-- Added true here
      getRandomPokemon(Math.floor(Math.random() * 151) + 1, false)
    ]);

    const playerMon = { ...p1, isPlayer: true };
    const enemyMon = { ...p2, isPlayer: false };

    setPlayer(playerMon);
    setEnemy(enemyMon);
    setIsGameStarted('BATTLE');

    if (p1.stats.speed >= p2.stats.speed) {
      setPlayerTurn(true);
      setGameLog((prev: string[]) => [...prev, `${p1.name} moves first!`]);
    } else {
      setPlayerTurn(false);
      setGameLog((prev: string[]) => [...prev, `${p2.name} is faster!`]);
      // Trigger enemy turn logic immediately
      executeEnemyTurn(playerMon, enemyMon);
    }
  };

  const spawnNewEnemy = async (targetFloor: number) => {
    // Note: Removed setEnemy(null) to prevent the screen from going blank during the fetch
    setPlayerTurn(true);

    const bossEnemy = targetFloor % 10 === 0;
    const legendaryPokemonIds = [144, 145, 146, 150]; 
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const pseduoLegendaryIds = [65, 94, 115, 248]; 
    const randomId = bossEnemy ? legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)] :
                     miniBossEnemy ? pseduoLegendaryIds[Math.floor(Math.random() * pseduoLegendaryIds.length)] :
                     Math.floor(Math.random() * 151) + 1;
    const newEnemy = await getRandomPokemon(randomId, false);

    const scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    if (bossEnemy) {
      scaledEnemy.stats.hp = Math.floor(scaledEnemy.stats.hp * 1.5);
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.5);
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.5);
    } else if (miniBossEnemy) {
      scaledEnemy.stats.hp = Math.floor(scaledEnemy.stats.hp * 1.2);
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.2);
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.2);
    }

    setEnemy({ ...scaledEnemy, isPlayer: false });

    const appearanceMsg = bossEnemy ? `A ${newEnemy.name} appears! It's a BOSS!` :
                         miniBossEnemy ? `It's a ${newEnemy.name} ?! A Mini-Boss!` :
                         `A wild ${newEnemy.name} appears!`;
    
    setGameLog((prev: string[]) => [...prev, appearanceMsg]);
  };

  const handleNextFloor = () => {
    const nextFloor = floor + 1;
    setFloor(nextFloor);
    spawnNewEnemy(nextFloor);
  };

  const handleEnemyDefeat = async (defeatedEnemy: Pokemon, currentPlayer: Pokemon) => {
    const xpGain = (defeatedEnemy.level || 1) * 50; 
    let newPlayer = { ...currentPlayer };
    const currentXp = newPlayer.xp || 0;
    const currentMaxXp = newPlayer.maxXp || 100;
    const totalXp = currentXp + xpGain;
    const oldLevel = newPlayer.level || 1; // Track old level

    if (totalXp >= currentMaxXp) {
      const overflow = totalXp - currentMaxXp;
      newPlayer = handleLevelUp(newPlayer, overflow);
      setGameLog((prev: string[]) => [...prev, `Level Up! You are now Lvl ${newPlayer.level}!`]);
      
      // NEW MOVE LEARNING LOGIC
      const movesToLearn = newPlayer.learnset?.filter(m => m.level > oldLevel && m.level <= (newPlayer.level || 0)) || [];
      
      for (const moveInfo of movesToLearn) {
        // Don't learn moves we already know
        if (newPlayer.moves?.some(m => m.name.toLowerCase() === moveInfo.name.replace('-', ' '))) continue;

        const fetchedMove = await fetchMoveDetails(moveInfo.url);
        if (fetchedMove) {
          if ((newPlayer.moves?.length || 0) < 4) {
            if (!newPlayer.moves) newPlayer.moves = [];
            newPlayer.moves.push(fetchedMove);
            setGameLog((prev: string[]) => [...prev, `${newPlayer.name} learned ${fetchedMove.name}!`]);
          } else {
            // Trigger the UI to ask the user to replace a move
            useGameStore.getState().setPendingMove(fetchedMove);
            break; // Stop checking for more moves to keep the UI clean (one at a time)
          }
        }
      }
    } else {
      newPlayer.xp = totalXp;
      setGameLog((prev: string[]) => [...prev, `You gained ${xpGain} XP.`]);
    }
    setPlayer(newPlayer);
    
    const baseLoot = getRandomUpgrades(2, currentPlayer.id);
    const currentEquipCount = currentPlayer.equipment?.length || 0;
    
    if (floor % 1 === 0 && currentEquipCount < 6) { 
      const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      let equipment = await fetchEquipmentFromPokeAPI(randomItemName);
      
      if (!equipment) {
        equipment = {
          id: `local-${randomItemName}`,
          name: randomItemName.replace('-', ' ').toUpperCase(),
          description: 'A powerful held item generated locally.',
          spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
          statModifiers: { attack: 10, defense: 10, maxHp: 20 }
        };
      }

      baseLoot.push({
        id: equipment.id,
        name: equipment.name,
        description: equipment.description,
        stat: 'equipment',
        amount: 0,
        equipment: equipment
      });
      
    } else {
      const extra = getRandomUpgrades(1)[0];
      extra.id = Math.random().toString();
      baseLoot.push(extra);
    }
    
    setUpgrades([...baseLoot]);
  };

  const executeEnemyTurn = async (currentPlayer: Pokemon, currentEnemy: Pokemon) => {
    // FIX 2: Reduced delay from 1000ms to 500ms for faster gameplay
    await wait(500);

    if (currentEnemy.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} thawed out!`]);
        setEnemy((e: Pokemon | null) => e ? { ...e, status: 'normal' } : null);
        currentEnemy.status = 'normal'; 
      } else {
        setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} is frozen solid!`]);
        setPlayerTurn(true);
        return;
      }
    } else if (currentEnemy.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} is paralyzed! It can't move!`]);
      setPlayerTurn(true);
      return;
    }

    const enemyMoves = currentEnemy.moves || [];
    const randomMove = enemyMoves.length > 0 
      ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
      : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

    // FIX 3: Push log message before waiting for animation
    setGameLog((prev: string[]) => [...prev, `${currentEnemy.name} prepares to use ${randomMove.name}!`]);

    setEnemyAnimation('animate-lunge-left');
    await wait(300);

    const playerDodge = getEffectiveStat(currentPlayer, 'dodge');
    if ((Math.random() * 100) < playerDodge) {
      setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} dodged the attack!`]);
      setEnemyAnimation('');
      setPlayerTurn(true);
      return;
    }

    const enemyCrit = getEffectiveStat(currentEnemy, 'critChance');
    const isCrit = (Math.random() * 100) < enemyCrit;
    const critMultiplier = isCrit ? 1.5 : 1;
    const effectiveness = getTypeEffectiveness(randomMove.type, currentPlayer.types);
    const playerDef = getEffectiveStat(currentPlayer, 'defense');
    const defenseMitigation = 100 / (100 + playerDef);
    const enemyAtk = getEffectiveStat(currentEnemy, 'attack');
    const baseDamage = (enemyAtk * randomMove.power) / 50;
    const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * critMultiplier));

    setPlayerAnimation('animate-shake');
    
    let appliedStatus = currentPlayer.status;
    let statusLog = '';
    if (randomMove.statusEffect && (!currentPlayer.status || currentPlayer.status === 'normal')) {
      if (randomMove.power === 0 || Math.random() < 0.3) {
        if (randomMove.statusEffect !== 'stunned') {
          appliedStatus = randomMove.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze';
          statusLog = ` ${currentPlayer.name} was inflicted with ${randomMove.statusEffect}!`;
        }
      }
    }

    const remainingHp = Math.max(currentPlayer.stats.hp - finalDamage, 0);
    let logMsg = `${currentEnemy.name} dealt ${finalDamage} damage!`;
    if (isCrit) logMsg += " A Critical Hit!";
    if (effectiveness > 1) logMsg += " It's Super Effective!";
    if (statusLog) logMsg += statusLog;

    setPlayer((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingHp }, status: appliedStatus } : null);
    setGameLog((prev: string[]) => [...prev, logMsg]);

    await wait(400);
    setEnemyAnimation('');
    setPlayerAnimation('');

    if (remainingHp <= 0) {
      if (floor > highScore) setHighScore(floor);
      return; 
    }

    setPlayerTurn(true);
  };

  const handleMoveClick = async (move: Move) => {
    if (!player || !enemy || !playerTurn) return;

    setPlayerTurn(false);
    let updatedPlayer = { ...player };

    if (player.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog((prev: string[]) => [...prev, `${player.name} thawed out!`]);
        updatedPlayer.status = 'normal';
        setPlayer(updatedPlayer);
      } else {
        setGameLog((prev: string[]) => [...prev, `${player.name} is frozen solid!`]);
        await executeEnemyTurn(updatedPlayer, enemy);
        return;
      }
    } else if (player.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog((prev: string[]) => [...prev, `${player.name} is paralyzed! It can't move!`]);
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    setPlayerAnimation('animate-lunge-right');
    setGameLog((prev: string[]) => [...prev, `${player.name} used ${move.name}!`]);

    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      await wait(300);
      setGameLog((prev: string[]) => [...prev, `${player.name} missed!`]);
      setPlayerAnimation(''); 
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    await wait(300);

    const enemyDodge = getEffectiveStat(enemy, 'dodge');
    if ((Math.random() * 100) < enemyDodge) {
      setGameLog((prev: string[]) => [...prev, `${enemy.name} dodged!`]);
      setPlayerAnimation(''); 
      await executeEnemyTurn(updatedPlayer, enemy);
      return;
    }

    const playerCrit = getEffectiveStat(player, 'critChance');
    const isCrit = (Math.random() * 100) < playerCrit;
    const critMultiplier = isCrit ? 1.5 : 1; 
    const effectiveness = getTypeEffectiveness(move.type, enemy.types);
    const enemyDef = getEffectiveStat(enemy, 'defense');
    const defenseMitigation = 100 / (100 + enemyDef);
    const playerAtk = getEffectiveStat(player, 'attack');
    const baseDamage = (playerAtk * move.power) / 50;
    const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * critMultiplier));

    setEnemyAnimation('animate-shake'); 
    
    let appliedStatus = enemy.status;
    let statusLog = '';
    if (move.statusEffect && (!enemy.status || enemy.status === 'normal')) {
      if (move.power === 0 || Math.random() < 0.3) {
        if (move.statusEffect !== 'stunned') {
          appliedStatus = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze';
          statusLog = ` ${enemy.name} was inflicted with ${move.statusEffect}!`;
        }
      }
    }

    const remainingEnemyHp = Math.max(enemy.stats.hp - finalDamage, 0);
    let logMsg = `It dealt ${finalDamage} damage!`;
    if (isCrit) logMsg += " A Critical Hit!";
    if (effectiveness > 1) logMsg += " It's Super Effective!";
    if (statusLog) logMsg += statusLog;

    // Handle tick damage for player before finalizing turn
    if (player.status === 'burn' || player.status === 'poison') {
      const tickDamage = Math.max(1, Math.floor(player.stats.maxHp * 0.1));
      updatedPlayer.stats.hp = Math.max(player.stats.hp - tickDamage, 0);
      setPlayer(updatedPlayer);
      logMsg += ` ${player.name} took ${tickDamage} damage from ${player.status}!`;
      
      if (updatedPlayer.stats.hp <= 0) {
        if (floor > highScore) setHighScore(floor);
        setGameLog((prev: string[]) => [...prev, logMsg]);
        return; 
      }
    }

    setEnemy((prev: Pokemon | null) => prev ? { ...prev, stats: { ...prev.stats, hp: remainingEnemyHp }, status: appliedStatus } : null);
    setGameLog((prev: string[]) => [...prev, logMsg]);

    await wait(400);
    setPlayerAnimation('');
    setEnemyAnimation('');

    if (remainingEnemyHp <= 0) {
      await handleEnemyDefeat(enemy, updatedPlayer);
      return; 
    }

    const updatedEnemy = { ...enemy, stats: { ...enemy.stats, hp: remainingEnemyHp }, status: appliedStatus };
    await executeEnemyTurn(updatedPlayer, updatedEnemy);
  };

  const handleSelectUpgrade = async (upgrade: Upgrade) => {
    if (!player) return;

    if (upgrade.stat === 'equipment' && upgrade.equipment) {
      const currentEquip = player.equipment || [];
      setPlayer({ ...player, equipment: [...currentEquip, upgrade.equipment] });
      setGameLog((prev: string[]) => [...prev, `Equipped ${upgrade.equipment!.name}!`, `Stat bonuses applied dynamically.`]);
      setUpgrades([]);
      handleNextFloor();
      return;
    }

    if (upgrade.stat === 'evolve') {
      const nextId = EVOLUTION_MAP ? EVOLUTION_MAP[player.id] : player.id + 1; 
      const evolvedBase = await getRandomPokemon(nextId, true);
      const currentLevel = player.level || 1;
      const scaledEvolved = scaleEnemyStats(evolvedBase, currentLevel);
      setPlayer({
        ...scaledEvolved,
        isPlayer: true,
        xp: player.xp,
        maxXp: player.maxXp,
        equipment: player.equipment 
      });
      setGameLog((prev: string[]) => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`]);
    } else {
      setPlayer((prev: Pokemon | null) => {
        if (!prev) return null;
        const targetStat = upgrade.stat as StatKey; 
        const newStats = {
          ...prev.stats,
          [targetStat]: prev.stats[targetStat] + upgrade.amount
        };
        if (targetStat === 'hp') {
          newStats.hp = Math.min(newStats.hp, prev.stats.maxHp);
        }
        return { ...prev, stats: newStats };
      });
    }
    setUpgrades([]);
    handleNextFloor();
  };

  const handleReplaceMove = (moveIndex: number) => {
    const { player, pendingMove, setPendingMove } = useGameStore.getState();
    if (!player || !pendingMove) return;

    const newMoves = [...(player.moves || [])];
    const oldMoveName = newMoves[moveIndex].name;
    newMoves[moveIndex] = pendingMove;

    setPlayer({ ...player, moves: newMoves });
    setGameLog((prev) => [...prev, `1, 2, and... Poof!`, `${player.name} forgot ${oldMoveName} and learned ${pendingMove.name}! `]);
    setPendingMove(null);
  };

  const handleSkipMove = () => {
    const { player, pendingMove, setPendingMove } = useGameStore.getState();
    if (!player || !pendingMove) return;
    
    setGameLog((prev) => [...prev, `${player.name} gave up on learning ${pendingMove.name}.`]);
    setPendingMove(null);
  };

  const gameOver = player?.stats.hp === 0 || enemy?.stats.hp === 0;
  const winner = enemy?.stats.hp === 0 ? 'Player' : 'Enemy';

  return {
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    handleReplaceMove, handleSkipMove,
    gameOver, winner
  };
};
