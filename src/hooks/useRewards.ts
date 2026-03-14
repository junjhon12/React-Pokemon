// src/hooks/useRewards.ts
import { type Pokemon, type StatKey } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';
import { fetchEquipmentFromPokeAPI, fetchMoveDetails, getRandomPokemon } from '../utils/api'; 
import { scaleEnemyStats, getRandomUpgrades, EVOLUTION_MAP } from '../utils/gameLogic';
import { ITEM_POOL } from '../data/items';
import { useGameStore } from '../store/gameStore';

export const applyPPScale = (move: Move): Move => {
  const power = move.power || 0;
  if (power > 100) move.maxPp = 2;       
  else if (power >= 80) move.maxPp = 5;  
  else if (power >= 55) move.maxPp = 10; 
  else move.maxPp = 20;                  
  move.pp = move.maxPp; 
  return move;
};

export const useRewards = (onNextFloor: () => void) => {
  const { floor } = useGameStore();

  const setPlayer = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setGameLog = (val: string[] | ((l: string[]) => string[])) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setUpgrades = (val: Upgrade[] | ((u: Upgrade[]) => Upgrade[])) => useGameStore.setState(typeof val === 'function' ? (s) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });

  function handleLevelUp(currentStats: Pokemon, overflowXp: number) {
      const newLevel = (currentStats.level || 1) + 1;
      const newMaxXp = Math.floor((currentStats.maxXp || 100) * 1.2);
      const newStats = { ...currentStats.stats };
      const upgradeableStats: StatKey[] = ['maxHp', 'attack', 'defense', 'speed'];
      
      const randomStat = upgradeableStats[Math.floor(Math.random() * upgradeableStats.length)];
      const increaseAmount = Math.floor(Math.random() * 2) + 1; 
      
      const actualIncrease = randomStat === 'maxHp' ? increaseAmount * 5 : increaseAmount;
      newStats[randomStat] += actualIncrease;
      newStats.hp = newStats.maxHp;

      return {
        player: { ...currentStats, level: newLevel, stats: newStats, xp: overflowXp, maxXp: newMaxXp },
        message: `${randomStat === 'maxHp' ? 'HP' : randomStat.toUpperCase()} increased by ${actualIncrease}!`
      };
  }

  // TRULY RANDOM MOVE DROPS
  const attemptMoveDrop = async () => {
    // 25% flat chance to find a move scroll
    if (Math.random() > 0.25) return null;

    let fetchedMove = null;
    let attempts = 0;

    // Pull completely random IDs from the API without type bias or power brackets
    while (!fetchedMove && attempts < 3) {
      attempts++;
      const randomMoveId = Math.floor(Math.random() * 826) + 1;
      const candidateMove = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${randomMoveId}`);
      
      if (candidateMove) {
          fetchedMove = applyPPScale(candidateMove); 
      }
    }
    
    if (!fetchedMove) return null;

    // Rarity is now just a visual descriptor of what you randomly found
    let rarityName = "Support";
    if (fetchedMove.power > 100) rarityName = "S-Tier";
    else if (fetchedMove.power >= 80) rarityName = "Rare";
    else if (fetchedMove.power >= 55) rarityName = "Uncommon";
    else if (fetchedMove.power > 0) rarityName = "Common";

    setGameLog((prev: string[]) => [...prev, `An enemy dropped a random ${rarityName} move scroll!`]);
    return fetchedMove;
  };

  const handleEnemyDefeat = async (defeatedEnemy: Pokemon, currentPlayer: Pokemon) => {
    const xpGain = (defeatedEnemy.level || 1) * 50; 
    let newPlayer = { ...currentPlayer };
    const totalXp = (newPlayer.xp || 0) + xpGain;
    const oldLevel = newPlayer.level || 1;
    
    if (!useGameStore.getState().pendingMove) {
      const droppedMove = await attemptMoveDrop();
      if (droppedMove) {
        if (!currentPlayer.moves?.some(m => m.name.toLowerCase() === droppedMove.name.toLowerCase())) {
          if (currentPlayer.moves && currentPlayer.moves.length < 4) {
            currentPlayer.moves.push(droppedMove);
            setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} found and learned ${droppedMove.name}!`]);
            setPlayer({...currentPlayer});
          } else {
            useGameStore.getState().setPendingMove(droppedMove);
          }
        } else {
          setGameLog((prev: string[]) => [...prev, `You found a ${droppedMove.name} scroll, but already know it.`]);
        }
      }
    }

    if (totalXp >= (newPlayer.maxXp || 100)) {
      const levelUpData = handleLevelUp(newPlayer, totalXp - (newPlayer.maxXp || 100));
      newPlayer = levelUpData.player;
      newPlayer.moves = newPlayer.moves?.map(m => ({ ...m, pp: m.maxPp || 20 }));
      
      setGameLog((prev: string[]) => [...prev, `Level Up! You are Lvl ${newPlayer.level}! PP Restored!`, levelUpData.message]);
      
      const movesToLearn = newPlayer.learnset?.filter(m => m.level > oldLevel && m.level <= (newPlayer.level || 1)) || [];
      for (const moveInfo of movesToLearn) {
        if (newPlayer.moves?.some(m => m.name.toLowerCase() === moveInfo.name.replace('-', ' '))) continue;
        const fetchedMove = await fetchMoveDetails(moveInfo.url);
        if (fetchedMove) {
          const scaledMove = applyPPScale(fetchedMove);
          if ((newPlayer.moves?.length || 0) < 4) {
            newPlayer.moves?.push(scaledMove);
            setGameLog((prev: string[]) => [...prev, `${newPlayer.name} learned ${scaledMove.name}!`]);
          } else {
            useGameStore.getState().setPendingMove(scaledMove);
            break; 
          }
        }
      }
    } else {
      newPlayer.xp = totalXp;
      setGameLog((prev: string[]) => [...prev, `You gained ${xpGain} XP.`]);
    }
    
    if (floor % 10 === 0) {
      newPlayer.moves = newPlayer.moves?.map(m => ({ ...m, pp: m.maxPp || 20 }));
      newPlayer.status = 'normal';
      setGameLog((prev: string[]) => [...prev, `Boss defeated! PP fully restored and status conditions cured!`]);
    }

    setPlayer(newPlayer);
    
    // TRULY RANDOM LOOT POOL
    const finalLoot: Upgrade[] = [];
    const numDrops = Math.floor(Math.random() * 3) + 1; // You can get 1, 2, or 3 rewards per room

    for (let i = 0; i < numDrops; i++) {
      const isEquipmentRoll = Math.random() < 0.25; // 25% chance this slot is equipment
      
      if (isEquipmentRoll && (currentPlayer.equipment?.length || 0) < 6) {
        const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
        const equipment = await fetchEquipmentFromPokeAPI(randomItemName) || {
            id: `local-${randomItemName}`, name: randomItemName.replace('-', ' ').toUpperCase(),
            description: 'A powerful held item generated locally.',
            spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
            statModifiers: { attack: 2, defense: 2, maxHp: 5 } 
        };
        // Ensure no duplicate items in the same loot pool
        if (!finalLoot.some(l => l.name === equipment.name)) {
          finalLoot.push({ id: Math.random().toString(), name: equipment.name, description: equipment.description, stat: 'equipment', amount: 0, equipment });
        }
      } else {
        // Roll a single random upgrade (Potion, Stat boost, Evo Stone, etc.)
        const randomUpgrade = getRandomUpgrades(1, currentPlayer.id, newPlayer.status)[0];
        finalLoot.push({ ...randomUpgrade, id: Math.random().toString() }); // Clone to allow duplicates (e.g., 2 Potions)
      }
    }
    
    setUpgrades(finalLoot);
  };

  const handleSelectUpgrade = async (upgrade: Upgrade) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    if (upgrade.stat === 'status') {
      setPlayer({ ...player, status: 'normal' });
      setGameLog((prev: string[]) => [...prev, `${player.name} used a Full Heal and cured its status!`]);
    } else if (upgrade.stat === 'equipment' && upgrade.equipment) {
      setPlayer({ ...player, equipment: [...(player.equipment || []), upgrade.equipment] });
      setGameLog((prev: string[]) => [...prev, `Equipped ${upgrade.equipment!.name}!`, `Stat bonuses applied dynamically.`]);
    } else if (upgrade.stat === 'evolve') {
      const nextId = EVOLUTION_MAP ? EVOLUTION_MAP[player.id] : player.id + 1; 
      const evolvedBase = await getRandomPokemon(nextId, true, player.level || 1);
      const scaledEvolved = scaleEnemyStats(evolvedBase, player.level || 1);
      setPlayer({ ...scaledEvolved, isPlayer: true, xp: player.xp, maxXp: player.maxXp, equipment: player.equipment, moves: player.moves });
      setGameLog((prev: string[]) => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`]);
    } else {
      setPlayer((prev: Pokemon | null) => {
        if (!prev) return null;
        const targetStat = upgrade.stat as StatKey; 
        const newStats = { ...prev.stats, [targetStat]: prev.stats[targetStat] + upgrade.amount };
        if (targetStat === 'hp') newStats.hp = Math.min(newStats.hp, prev.stats.maxHp);
        return { ...prev, stats: newStats };
      });
    }
    setUpgrades([]);
    onNextFloor();
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

  return { handleEnemyDefeat, handleSelectUpgrade, handleReplaceMove, handleSkipMove };
};