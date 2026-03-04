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

// We pass `onNextFloor` in as a prop so this hook knows how to advance the game
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

  const attemptMoveDrop = async (currentPlayer: Pokemon) => {
    if (Math.random() > 0.14) return null;
    const isTypeMatch = Math.random() <= 0.80;
    const rarityRoll = Math.random();
    
    let targetMinPower = 0; let targetMaxPower = 50; let rarityName = "Common";
    if (rarityRoll > 0.98) { targetMinPower = 101; targetMaxPower = 250; rarityName = "S-Tier"; }
    else if (rarityRoll > 0.95) { targetMinPower = 80; targetMaxPower = 100; rarityName = "Rare"; }
    else if (rarityRoll > 0.75) { targetMinPower = 55; targetMaxPower = 75; rarityName = "Uncommon"; }

    let fetchedMove = null; let attempts = 0;
    while (!fetchedMove && attempts < 6) {
      attempts++;
      let candidateMove = null;
      if (isTypeMatch && currentPlayer.learnset && currentPlayer.learnset.length > 0) {
        const randomLearnsetMove = currentPlayer.learnset[Math.floor(Math.random() * currentPlayer.learnset.length)];
        candidateMove = await fetchMoveDetails(randomLearnsetMove.url);
      } else {
        const randomMoveId = Math.floor(Math.random() * 826) + 1;
        candidateMove = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${randomMoveId}`);
      }
      if (candidateMove && (candidateMove.power || 0) >= targetMinPower && (candidateMove.power || 0) <= targetMaxPower) {
          fetchedMove = applyPPScale(candidateMove); 
      }
    }
    if (!fetchedMove) return null;
    setGameLog((prev: string[]) => [...prev, `An enemy dropped a ${rarityName} move scroll!`]);
    return fetchedMove;
  };

  const handleEnemyDefeat = async (defeatedEnemy: Pokemon, currentPlayer: Pokemon) => {
    const xpGain = (defeatedEnemy.level || 1) * 50; 
    let newPlayer = { ...currentPlayer };
    const totalXp = (newPlayer.xp || 0) + xpGain;
    const oldLevel = newPlayer.level || 1;
    
    if (!useGameStore.getState().pendingMove) {
      const droppedMove = await attemptMoveDrop(currentPlayer);
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
    
    const baseLoot = getRandomUpgrades(2, currentPlayer.id, newPlayer.status);
    if (floor % 1 === 0 && (currentPlayer.equipment?.length || 0) < 6) { 
      const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      let equipment = await fetchEquipmentFromPokeAPI(randomItemName) || {
          id: `local-${randomItemName}`, name: randomItemName.replace('-', ' ').toUpperCase(),
          description: 'A powerful held item generated locally.',
          spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
          statModifiers: { attack: 2, defense: 2, maxHp: 5 } 
      };
      baseLoot.push({ id: equipment.id, name: equipment.name, description: equipment.description, stat: 'equipment', amount: 0, equipment });
    } else {
      const extra = getRandomUpgrades(1)[0]; extra.id = Math.random().toString(); baseLoot.push(extra);
    }
    
    setUpgrades([...baseLoot]);
  };

  const handleSelectUpgrade = async (upgrade: Upgrade) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    if (upgrade.stat === ('status' as any)) {
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