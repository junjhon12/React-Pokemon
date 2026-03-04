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

  // NEW: Random Stat Selection Level Up
  function handleLevelUp(currentStats: Pokemon, overflowXp: number) {
      const newLevel = (currentStats.level || 1) + 1;
      const newMaxXp = Math.floor((currentStats.maxXp || 100) * 1.2);

      const newStats = { ...currentStats.stats };
      const upgradeableStats: StatKey[] = ['maxHp', 'attack', 'defense', 'speed'];
      
      const randomStat = upgradeableStats[Math.floor(Math.random() * upgradeableStats.length)];
      const increaseAmount = Math.floor(Math.random() * 2) + 1; // Increases by 1 or 2
      
      const actualIncrease = randomStat === 'maxHp' ? increaseAmount * 5 : increaseAmount;
      newStats[randomStat] += actualIncrease;
      newStats.hp = newStats.maxHp; // Fully heal on level up

      const statName = randomStat === 'maxHp' ? 'HP' : randomStat.toUpperCase();

      return {
        player: {
          ...currentStats,
          level: newLevel,
          stats: newStats,
          xp: overflowXp,
          maxXp: newMaxXp
        },
        message: `${statName} increased by ${actualIncrease}!`
      };
  }

  const startGame = () => setIsGameStarted('SELECT');

  const selectStarterAndStart = async (starterId: number) => {
    setFloor(1);
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    const earlyEnemies = [10, 13, 16, 19, 21, 29, 32, 41, 43, 46, 69]; 
    const initialEnemyId = earlyEnemies[Math.floor(Math.random() * earlyEnemies.length)];

    const [p1, p2] = await Promise.all([
      getRandomPokemon(starterId, true, 1), 
      getRandomPokemon(initialEnemyId, false, 1) 
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
      executeEnemyTurn(playerMon, enemyMon);
    }
  };

  const spawnNewEnemy = async (targetFloor: number) => {
    setPlayerTurn(true);

    const bossEnemy = targetFloor % 10 === 0;
    const legendaryPokemonIds = [144, 145, 146, 150, 151]; 
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const pseudoLegendaryIds = [65, 94, 115, 130, 143, 149]; 

    let randomId;

    if (bossEnemy) {
      randomId = legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)];
    } else if (miniBossEnemy) {
      randomId = pseudoLegendaryIds[Math.floor(Math.random() * pseudoLegendaryIds.length)];
    } else if (targetFloor <= 3) {
      const earlyEnemies = [10, 13, 16, 19, 21, 29, 32, 41, 43, 46, 69];
      randomId = earlyEnemies[Math.floor(Math.random() * earlyEnemies.length)];
    } else {
      do {
        randomId = Math.floor(Math.random() * 151) + 1;
      } while (legendaryPokemonIds.includes(randomId) || pseudoLegendaryIds.includes(randomId));
    }

    const newEnemy = await getRandomPokemon(randomId, false, targetFloor);
    const scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    // CHANGED: Use flat amounts instead of multipliers so the boss is actually scary on the new 1-4 scale
    if (bossEnemy) {
      scaledEnemy.stats.maxHp += 20;
      scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack += 3;
      scaledEnemy.stats.defense += 2;
      scaledEnemy.stats.speed += 2;
    } else if (miniBossEnemy) {
      scaledEnemy.stats.maxHp += 10;
      scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack += 1;
      scaledEnemy.stats.defense += 1;
      scaledEnemy.stats.speed += 1;
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
    const oldLevel = newPlayer.level || 1;
    // Check if we are already dealing with a pending move from a level-up
    const currentPendingMove = useGameStore.getState().pendingMove;
    
    // Only roll for a move drop if they aren't already replacing a move from leveling up
    if (!currentPendingMove) {
      const droppedMove = await attemptMoveDrop(currentPlayer);
      
      if (droppedMove) {
        // Check if player already knows this move
        const alreadyKnows = currentPlayer.moves?.some(m => m.name.toLowerCase() === droppedMove.name.toLowerCase());
        
        if (!alreadyKnows) {
          if (currentPlayer.moves && currentPlayer.moves.length < 4) {
            // Auto-learn if they have an empty slot
            currentPlayer.moves.push(droppedMove);
            setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} found and learned ${droppedMove.name}!`]);
            setPlayer({...currentPlayer});
          } else {
            // Trigger your existing MoveReplacementOverlay!
            useGameStore.getState().setPendingMove(droppedMove);
          }
        } else {
          setGameLog((prev: string[]) => [...prev, `You found a ${droppedMove.name} scroll, but ${currentPlayer.name} already knows it.`]);
        }
      }
    }
    if (totalXp >= currentMaxXp) {
      const overflow = totalXp - currentMaxXp;
      
      // Updated Level Up Logger
      const levelUpData = handleLevelUp(newPlayer, overflow);
      newPlayer = levelUpData.player;
      
      const currentLevel = newPlayer.level || 1;
      setGameLog((prev: string[]) => [...prev, `Level Up! You are now Lvl ${currentLevel}!`, levelUpData.message]);
      
      newPlayer.moves = newPlayer.moves || [];
      
      const movesToLearn = newPlayer.learnset?.filter(m => m.level > oldLevel && m.level <= currentLevel) || [];
      
      for (const moveInfo of movesToLearn) {
        if (newPlayer.moves.some(m => m.name.toLowerCase() === moveInfo.name.replace('-', ' '))) continue;

        const fetchedMove = await fetchMoveDetails(moveInfo.url);
        if (fetchedMove) {
          if (newPlayer.moves.length < 4) {
            newPlayer.moves.push(fetchedMove);
            setGameLog((prev: string[]) => [...prev, `${newPlayer.name} learned ${fetchedMove.name}!`]);
          } else {
            useGameStore.getState().setPendingMove(fetchedMove);
            break; 
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
          statModifiers: { attack: 2, defense: 2, maxHp: 5 } // Scaled fallback item stats
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
    const defenseMitigation = 10 / (10 + playerDef); // FIXED MITIGATION FORMULA
    
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
    const defenseMitigation = 10 / (10 + enemyDef); // FIXED MITIGATION FORMULA
    
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
      const currentLevel = player.level || 1;
      
      const evolvedBase = await getRandomPokemon(nextId, true, currentLevel);
      const scaledEvolved = scaleEnemyStats(evolvedBase, currentLevel);
      
      setPlayer({
        ...scaledEvolved,
        isPlayer: true,
        xp: player.xp,
        maxXp: player.maxXp,
        equipment: player.equipment,
        moves: player.moves 
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

  const attemptMoveDrop = async (currentPlayer: Pokemon) => {
    // 14% chance to drop a move
    if (Math.random() > 0.14) return null;

    const isTypeMatch = Math.random() <= 0.80;
    const rarityRoll = Math.random();
    
    let targetMinPower = 0;
    let targetMaxPower = 50;
    let rarityName = "Common";

    if (rarityRoll > 0.98) { targetMinPower = 101; targetMaxPower = 250; rarityName = "S-Tier"; }
    else if (rarityRoll > 0.95) { targetMinPower = 80; targetMaxPower = 100; rarityName = "Rare"; }
    else if (rarityRoll > 0.75) { targetMinPower = 55; targetMaxPower = 75; rarityName = "Uncommon"; }

    let fetchedMove = null;
    let attempts = 0;
    const maxAttempts = 6; // Limit API calls so the game doesn't freeze

    // Keep looking until we find a move that fits the power requirement, or we run out of attempts
    while (!fetchedMove && attempts < maxAttempts) {
      attempts++;
      let candidateMove = null;

      if (isTypeMatch && currentPlayer.learnset && currentPlayer.learnset.length > 0) {
        // Pick a random move from the player's learnset
        const randomLearnsetMove = currentPlayer.learnset[Math.floor(Math.random() * currentPlayer.learnset.length)];
        candidateMove = await fetchMoveDetails(randomLearnsetMove.url);
      } else {
        // Random move ID from PokeAPI
        const randomMoveId = Math.floor(Math.random() * 826) + 1;
        candidateMove = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${randomMoveId}`);
      }

      if (candidateMove) {
        const movePower = candidateMove.power || 0; // Status moves have null power in PokeAPI, treat as 0
        
        // Check if the move is within our power tier!
        if (movePower >= targetMinPower && movePower <= targetMaxPower) {
          fetchedMove = candidateMove;
        }
      }
    }

    // If we failed to find a matching move after 6 tries, just abort the drop
    // (This prevents giving the player a Common move when the UI promised an S-Tier)
    if (!fetchedMove) return null;

    // Only log the drop if we successfully found one!
    setGameLog((prev: string[]) => [...prev, `An enemy dropped a ${rarityName} move scroll!`]);

    return fetchedMove;
  };

  const gameOver = player?.stats.hp === 0 || enemy?.stats.hp === 0;
  const winner = enemy?.stats.hp === 0 ? 'Player' : 'Enemy';

  return {
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    handleReplaceMove, handleSkipMove,
    gameOver, winner
  };
};