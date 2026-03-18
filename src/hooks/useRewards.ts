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

// ── Move draft helpers ────────────────────────────────────────────────────────

const isUsefulMove = (move: Move): boolean => {
  if (move.power > 0) return true;
  if (move.leechSeed) return true;
  if (move.drain && move.drain > 0) return true;
  if (move.stageChange) {
    const totalChange = Object.values(move.stageChange).reduce((a, b) => a + Math.abs(b), 0);
    return totalChange >= 2;
  }
  return false;
};

const fetchLearnsetCandidates = async (player: Pokemon, floor: number): Promise<Move[]> => {
  if (!player.learnset || player.learnset.length === 0) return [];

  const knownNames = new Set(player.moves.map(m => m.name.toLowerCase()));
  const maxLevel   = Math.max(floor + 5, 20);

  const eligible = player.learnset
    .filter(entry => entry.level <= maxLevel && !knownNames.has(entry.name.replace(/-/g, ' ')))
    .sort((a, b) => b.level - a.level)
    .slice(0, 12);

  const fetched = await Promise.all(
    eligible.map(entry => fetchMoveDetails(entry.url, false))
  );

  return fetched
    .filter((m): m is Move => m !== null && isUsefulMove(m))
    .map(m => applyPPScale(m));
};

const fetchTypedCandidates = async (
  playerTypes: string[],
  knownNames: Set<string>,
  needed: number
): Promise<Move[]> => {
  const results: Move[] = [];
  let attempts = 0;
  const maxAttempts = needed * 6;

  while (results.length < needed && attempts < maxAttempts) {
    attempts++;
    const randomId = Math.floor(Math.random() * 400) + 1;
    try {
      const move = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${randomId}`, false);
      if (
        move &&
        isUsefulMove(move) &&
        !knownNames.has(move.name.toLowerCase()) &&
        !results.some(r => r.name === move.name) &&
        (playerTypes.includes(move.type) || move.power >= 80)
      ) {
        results.push(applyPPScale(move));
      }
    } catch { /* ignore */ }
  }
  return results;
};

const buildMoveDraft = async (player: Pokemon, floor: number, count = 3): Promise<Move[]> => {
  const knownNames   = new Set(player.moves.map(m => m.name.toLowerCase()));
  const learnsetPool = await fetchLearnsetCandidates(player, floor);
  const shuffled     = learnsetPool.sort(() => Math.random() - 0.5);
  const draft        = shuffled.slice(0, count);

  if (draft.length < count) {
    const usedNames = new Set([...knownNames, ...draft.map(m => m.name.toLowerCase())]);
    const padded    = await fetchTypedCandidates(player.types, usedNames, count - draft.length);
    draft.push(...padded);
  }

  if (draft.length < count) {
    const genericIds = [53, 87, 58, 74, 89, 94];
    for (const id of genericIds) {
      if (draft.length >= count) break;
      try {
        const move = await fetchMoveDetails(`https://pokeapi.co/api/v2/move/${id}`, false);
        if (move && !knownNames.has(move.name.toLowerCase()) && !draft.some(d => d.name === move.name)) {
          draft.push(applyPPScale(move));
        }
      } catch { /* ignore */ }
    }
  }

  return draft.slice(0, count);
};

// ── Main hook ─────────────────────────────────────────────────────────────────

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
    const upgradeableStats: StatKey[] = ['maxHp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];

    const randomStat     = upgradeableStats[Math.floor(Math.random() * upgradeableStats.length)];
    const increaseAmount = Math.floor(Math.random() * 2) + 1 + Math.floor(newLevel / 5);
    const actualIncrease = randomStat === 'maxHp' ? increaseAmount * 5 : increaseAmount;

    newStats[randomStat] = (newStats[randomStat] ?? 0) + actualIncrease;

    return {
      player:  { ...currentStats, level: newLevel, stats: newStats, xp: overflowXp, maxXp: newMaxXp },
      message: `${randomStat === 'maxHp' ? 'HP' : randomStat.toUpperCase()} increased by ${actualIncrease}!`,
    };
  }

  // Reads floor from store directly — no param needed
  const buildLoot = async (currentPlayer: Pokemon) => {
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
      const candidate   = getRandomUpgrades(1, currentPlayer.id)[0];
      const slotUpgrade = { ...candidate, id: Math.random().toString() };
      if (!usedNames.has(slotUpgrade.name)) {
        finalLoot.push(slotUpgrade);
        usedNames.add(slotUpgrade.name);
      }
    }

    setUpgrades(finalLoot);
  };

  const handleEnemyDefeat = async (defeatedEnemy: Pokemon, currentPlayer: Pokemon) => {
    const floor   = useGameStore.getState().floor;
    const xpGain  = Math.floor((defeatedEnemy.level || 1) * 50 * (1 + floor * 0.1));
    let newPlayer = { ...currentPlayer };
    const totalXp = (newPlayer.xp || 0) + xpGain;
    const oldLevel = newPlayer.level || 1;

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
        if (newPlayer.moves?.some(m => m.name.toLowerCase() === moveInfo.name.replace(/-/g, ' '))) continue;
        const fetchedMove = await fetchMoveDetails(moveInfo.url, false);
        if (fetchedMove && isUsefulMove(fetchedMove)) {
          const scaledMove = applyPPScale(fetchedMove);
          if ((newPlayer.moves?.length || 0) < 4) {
            newPlayer.moves = [...(newPlayer.moves || []), scaledMove];
            setGameLog((prev: string[]) => [...prev, `${newPlayer.name} learned ${scaledMove.name}!`].slice(-100));
          }
        }
      }
    } else {
      newPlayer.xp = totalXp;
      setGameLog((prev: string[]) => [...prev, `You gained ${xpGain} XP.`].slice(-100));
    }

    newPlayer.stats  = { ...newPlayer.stats, hp: newPlayer.stats.maxHp };
    newPlayer.status = 'normal';
    setGameLog((prev: string[]) => [...prev, `${newPlayer.name} recovered fully!`].slice(-100));

    if (floor % 10 === 0) {
      newPlayer.moves = newPlayer.moves?.map(m => ({ ...m, pp: m.maxPp || 20 }));
      setGameLog((prev: string[]) => [...prev, `Boss defeated! PP fully restored!`].slice(-100));
    }

    setPlayer(newPlayer);

    setGameLog((prev: string[]) => [...prev, `Choose a new move to learn...`].slice(-100));
    const draft = await buildMoveDraft(newPlayer, floor, 3);
    if (draft.length > 0) {
      useGameStore.getState().setPendingMoveChoices(draft);
    } else {
      setGameLog((prev: string[]) => [...prev, `No new moves available — moving on.`].slice(-100));
      buildLoot(currentPlayer);
    }
  };

  const handlePickMove = (chosenMove: Move | null) => {
    const { player, setPendingMoveChoices, setPendingMove } = useGameStore.getState();
    if (!player) return;

    setPendingMoveChoices([]);

    if (!chosenMove) {
      setGameLog((prev) => [...prev, `${player.name} passed on learning a new move.`].slice(-100));
      buildLoot(player);
      return;
    }

    if ((player.moves?.length || 0) < 4) {
      const newMoves = [...(player.moves || []), chosenMove];
      const updated  = { ...player, moves: newMoves };
      setPlayer(updated);
      setGameLog((prev) => [...prev, `${player.name} learned ${chosenMove.name}!`].slice(-100));
      buildLoot(updated);
    } else {
      setPendingMove(chosenMove);
    }
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
        const newStats   = { ...prev.stats, [targetStat]: (prev.stats[targetStat] ?? 0) + upgrade.amount };
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
    const updated       = { ...player, moves: newMoves };
    setPlayer(updated);
    setGameLog((prev) => [...prev, `1, 2, and... Poof!`, `${player.name} forgot ${oldMoveName} and learned ${pendingMove.name}!`].slice(-100));
    setPendingMove(null);
    buildLoot(updated);
  };

  const handleSkipMove = () => {
    const { player, pendingMove, setPendingMove } = useGameStore.getState();
    if (!player || !pendingMove) return;
    setGameLog((prev) => [...prev, `${player.name} gave up on learning ${pendingMove.name}.`].slice(-100));
    setPendingMove(null);
    buildLoot(player);
  };

  return { handleEnemyDefeat, handlePickMove, handleSelectUpgrade, handleReplaceMove, handleSkipMove };
};