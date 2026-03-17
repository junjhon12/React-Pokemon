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
  if (power > 100)      move.maxPp = 2;
  else if (power >= 80) move.maxPp = 5;
  else if (power >= 55) move.maxPp = 10;
  else                  move.maxPp = 20;
  move.pp = move.maxPp;
  return move;
};

export const useRewards = (onNextFloor: () => void) => {
  const setPlayer   = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) =>
    useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setGameLog  = (val: string[] | ((l: string[]) => string[])) =>
    useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setUpgrades = (val: Upgrade[] | ((u: Upgrade[]) => Upgrade[])) =>
    useGameStore.setState(typeof val === 'function' ? (s) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });

  function handleLevelUp(currentStats: Pokemon, overflowXp: number) {
    const newLevel   = (currentStats.level || 1) + 1;
    const newMaxXp   = Math.floor((currentStats.maxXp || 100) * 1.3);
    const newStats   = { ...currentStats.stats };
    const upgradeableStats: StatKey[] = ['maxHp', 'attack', 'defense', 'speed'];

    const randomStat     = upgradeableStats[Math.floor(Math.random() * upgradeableStats.length)];
    const increaseAmount = Math.floor(Math.random() * 2) + 1 + Math.floor(newLevel / 5);
    const actualIncrease = randomStat === 'maxHp' ? increaseAmount * 5 : increaseAmount;

    newStats[randomStat] += actualIncrease;
    // Do NOT restore HP here — HP only restores via the post-battle auto-heal below.

    return {
      player:  { ...currentStats, level: newLevel, stats: newStats, xp: overflowXp, maxXp: newMaxXp },
      message: `${randomStat === 'maxHp' ? 'HP' : randomStat.toUpperCase()} increased by ${actualIncrease}!`,
    };
  }

  const attemptMoveDrop = async () => {
    if (Math.random() > 0.25) return null;

    let fetchedMove = null;
    let attempts    = 0;

    while (!fetchedMove && attempts < 3) {
      attempts++;
      const randomMoveId  = Math.floor(Math.random() * 826) + 1;
      const candidateMove = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${randomMoveId}`, false);
      if (candidateMove) fetchedMove = applyPPScale(candidateMove);
    }

    if (!fetchedMove) return null;

    let rarityName = 'Support';
    if (fetchedMove.power > 100)      rarityName = 'S-Tier';
    else if (fetchedMove.power >= 80) rarityName = 'Rare';
    else if (fetchedMove.power >= 55) rarityName = 'Uncommon';
    else if (fetchedMove.power > 0)   rarityName = 'Common';

    setGameLog((prev: string[]) => [...prev, `An enemy dropped a random ${rarityName} move scroll!`].slice(-100));
    return fetchedMove;
  };

  const handleEnemyDefeat = async (defeatedEnemy: Pokemon, currentPlayer: Pokemon) => {
    const floor   = useGameStore.getState().floor;
    const xpGain  = Math.floor((defeatedEnemy.level || 1) * 50 * (1 + floor * 0.1));
    let newPlayer = { ...currentPlayer };
    const totalXp = (newPlayer.xp || 0) + xpGain;
    const oldLevel = newPlayer.level || 1;

    if (!useGameStore.getState().pendingMove) {
      const droppedMove = await attemptMoveDrop();
      if (droppedMove) {
        if (!currentPlayer.moves?.some(m => m.name.toLowerCase() === droppedMove.name.toLowerCase())) {
          if (currentPlayer.moves && currentPlayer.moves.length < 4) {
            const newMoves = [...currentPlayer.moves, droppedMove];
            setGameLog((prev: string[]) => [...prev, `${currentPlayer.name} found and learned ${droppedMove.name}!`].slice(-100));
            setPlayer({ ...currentPlayer, moves: newMoves });
          } else {
            useGameStore.getState().setPendingMove(droppedMove);
          }
        } else {
          setGameLog((prev: string[]) => [...prev, `You found a ${droppedMove.name} scroll, but already know it.`].slice(-100));
        }
      }
    }

    if (totalXp >= (newPlayer.maxXp || 100)) {
      const levelUpData = handleLevelUp(newPlayer, totalXp - (newPlayer.maxXp || 100));
      newPlayer = levelUpData.player;
      newPlayer.moves = newPlayer.moves?.map(m => ({ ...m, pp: m.maxPp || 20 }));

      setGameLog((prev: string[]) => [
        ...prev,
        `Level Up! You are Lvl ${newPlayer.level}! PP Restored!`,
        levelUpData.message,
      ].slice(-100));

      const movesToLearn = newPlayer.learnset?.filter(
        m => m.level > oldLevel && m.level <= (newPlayer.level || 1)
      ) || [];

      for (const moveInfo of movesToLearn) {
        if (newPlayer.moves?.some(m => m.name.toLowerCase() === moveInfo.name.replace('-', ' '))) continue;
        const fetchedMove = await fetchMoveDetails(moveInfo.url, false);
        if (fetchedMove) {
          const scaledMove = applyPPScale(fetchedMove);
          if ((newPlayer.moves?.length || 0) < 4) {
            newPlayer.moves?.push(scaledMove);
            setGameLog((prev: string[]) => [...prev, `${newPlayer.name} learned ${scaledMove.name}!`].slice(-100));
          } else {
            useGameStore.getState().setPendingMove(scaledMove);
            break;
          }
        }
      }
    } else {
      newPlayer.xp = totalXp;
      setGameLog((prev: string[]) => [...prev, `You gained ${xpGain} XP.`].slice(-100));
    }

    // Always fully restore HP and clear all status after every victory
    newPlayer.stats  = { ...newPlayer.stats, hp: newPlayer.stats.maxHp };
    newPlayer.status = 'normal';
    setGameLog((prev: string[]) => [...prev, `${newPlayer.name} recovered fully!`].slice(-100));

    if (floor % 10 === 0) {
      newPlayer.moves = newPlayer.moves?.map(m => ({ ...m, pp: m.maxPp || 20 }));
      setGameLog((prev: string[]) => [...prev, `Boss defeated! PP fully restored!`].slice(-100));
    }

    setPlayer(newPlayer);

    // Loot: no Potion slot — 3 slots are stat upgrades / equipment / evo stone only
    const finalLoot: Upgrade[] = [];
    const usedNames = new Set<string>();

    const canEquip = (currentPlayer.equipment?.length || 0) < 6;
    if (Math.random() < 0.35 && canEquip) {
      const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
      const equipment = await fetchEquipmentFromPokeAPI(randomItemName);
      if (equipment && !usedNames.has(equipment.name)) {
        finalLoot.push({
          id: Math.random().toString(), name: equipment.name,
          description: equipment.description, stat: 'equipment', amount: 0, equipment,
        });
        usedNames.add(equipment.name);
      }
    }

    let attempts = 0;
    while (finalLoot.length < 3 && attempts < 15) {
      attempts++;
      // No playerStatus arg — status is auto-cleared, Full Heal never appears in loot
      const candidate   = getRandomUpgrades(1, currentPlayer.id)[0];
      const slotUpgrade = { ...candidate, id: Math.random().toString() };
      if (!usedNames.has(slotUpgrade.name)) {
        finalLoot.push(slotUpgrade);
        usedNames.add(slotUpgrade.name);
      }
    }

    setUpgrades(finalLoot);
  };

  const handleSelectUpgrade = async (upgrade: Upgrade) => {
    const player = useGameStore.getState().player;
    if (!player) return;

    if (upgrade.stat === 'equipment' && upgrade.equipment) {
      setPlayer({ ...player, equipment: [...(player.equipment || []), upgrade.equipment] });
      setGameLog((prev: string[]) => [...prev, `Equipped ${upgrade.equipment!.name}!`, `Stat bonuses applied dynamically.`].slice(-100));
    } else if (upgrade.stat === 'evolve') {
      const nextId        = EVOLUTION_MAP ? EVOLUTION_MAP[player.id] : player.id + 1;
      const evolvedBase   = await getRandomPokemon(nextId, true, player.level || 1);
      const scaledEvolved = scaleEnemyStats(evolvedBase, player.level || 1);
      setPlayer({ ...scaledEvolved, isPlayer: true, xp: player.xp, maxXp: player.maxXp, equipment: player.equipment, moves: player.moves });
      setGameLog((prev: string[]) => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`].slice(-100));
    } else {
      setPlayer((prev: Pokemon | null) => {
        if (!prev) return null;
        const targetStat = upgrade.stat as StatKey;
        const newStats   = { ...prev.stats, [targetStat]: prev.stats[targetStat] + upgrade.amount };
        if (targetStat === 'hp') {
          newStats.hp = Math.min(prev.stats.hp + upgrade.amount, prev.stats.maxHp);
        }
        return { ...prev, stats: newStats };
      });
    }
    setUpgrades([]);
    onNextFloor();
  };

  const handleReplaceMove = (moveIndex: number) => {
    const { player, pendingMove, setPendingMove } = useGameStore.getState();
    if (!player || !pendingMove) return;
    const newMoves      = [...(player.moves || [])];
    const oldMoveName   = newMoves[moveIndex].name;
    newMoves[moveIndex] = pendingMove;
    setPlayer({ ...player, moves: newMoves });
    setGameLog((prev) => [...prev, `1, 2, and... Poof!`, `${player.name} forgot ${oldMoveName} and learned ${pendingMove.name}!`].slice(-100));
    setPendingMove(null);
  };

  const handleSkipMove = () => {
    const { player, pendingMove, setPendingMove } = useGameStore.getState();
    if (!player || !pendingMove) return;
    setGameLog((prev) => [...prev, `${player.name} gave up on learning ${pendingMove.name}.`].slice(-100));
    setPendingMove(null);
  };

  return { handleEnemyDefeat, handleSelectUpgrade, handleReplaceMove, handleSkipMove };
};