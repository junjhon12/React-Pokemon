// src/hooks/useGameEngine.ts
import { getRandomPokemon } from '../utils/api';
import { scaleEnemyStats } from '../utils/gameLogic';
import { useGameStore, type DungeonModifier, type GameState } from '../store/gameStore';
import { useRewards, applyPPScale } from './useRewards';
import { useCombat } from './useCombat';
import { type Pokemon } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';

export const useGameEngine = () => {
  const { player, enemy } = useGameStore();

  const setPlayer   = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ player: val(s.player) }) : { player: val });
  const setEnemy    = (val: Pokemon | null | ((e: Pokemon | null) => Pokemon | null)) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: boolean | ((t: boolean) => boolean)) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog  = (val: string[] | ((l: string[]) => string[])) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setFloor    = (val: number | ((f: number) => number)) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ floor: val(s.floor) }) : { floor: val });
  const setUpgrades = (val: Upgrade[] | ((u: Upgrade[]) => Upgrade[])) =>
    useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });
  const setIsGameStarted   = (val: 'START' | 'SELECT' | 'BATTLE') => useGameStore.setState({ isGameStarted: val });
  const setDungeonModifier = (mod: DungeonModifier) => useGameStore.setState({ dungeonModifier: mod });

  const spawnNewEnemy = async (targetFloor: number) => {
    setPlayerTurn(true);
    const bossEnemy     = targetFloor % 10 === 0;
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const legendaryPokemonIds = [144, 145, 146, 150, 151];
    // FIX: Removed Snorlax (143) — too bulky for early floors
    const pseudoLegendaryIds  = [65, 94, 115, 130, 149];

    if (targetFloor > 1 && targetFloor % 5 === 0) {
      const modifiers: DungeonModifier[] = ['volcanic', 'thick-fog', 'electric-terrain', 'hail'];
      const rolledMod = modifiers[Math.floor(Math.random() * modifiers.length)];
      setDungeonModifier(rolledMod);
      setGameLog((prev: string[]) => [...prev, `⚠️ DUNGEON MUTATED: ${rolledMod.toUpperCase()} ⚠️`].slice(-100));
    } else if (targetFloor === 1 || targetFloor % 5 === 1) {
      setDungeonModifier('none');
    }

    const earlyGameIds = [10, 13, 16, 19, 21, 27, 29, 32, 37, 41, 43, 46, 50, 60, 69, 74];

    let randomId: number;
    if (bossEnemy)          randomId = legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)];
    else if (miniBossEnemy) randomId = pseudoLegendaryIds[Math.floor(Math.random() * pseudoLegendaryIds.length)];
    else if (targetFloor <= 3) randomId = earlyGameIds[Math.floor(Math.random() * earlyGameIds.length)];
    else do { randomId = Math.floor(Math.random() * 151) + 1; }
      while (legendaryPokemonIds.includes(randomId) || pseudoLegendaryIds.includes(randomId));

    const newEnemy    = await getRandomPokemon(randomId, false, targetFloor);
    const scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    if (bossEnemy) {
      scaledEnemy.stats.maxHp   = Math.floor(scaledEnemy.stats.maxHp  * 2.5);
      scaledEnemy.stats.hp      = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack  = Math.floor(scaledEnemy.stats.attack  * 1.3);
      scaledEnemy.stats.defense = Math.floor(scaledEnemy.stats.defense * 1.3);
      scaledEnemy.stats.speed   = Math.floor(scaledEnemy.stats.speed   * 1.2);
    } else if (miniBossEnemy) {
      // FIX: Softer HP cap for naturally bulky Pokémon (base scaled HP >= 80)
      const hpMult = scaledEnemy.stats.maxHp >= 80 ? 1.2 : 1.5;
      scaledEnemy.stats.maxHp   = Math.floor(scaledEnemy.stats.maxHp  * hpMult);
      scaledEnemy.stats.hp      = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack  = Math.floor(scaledEnemy.stats.attack  * 1.15);
      scaledEnemy.stats.defense = Math.floor(scaledEnemy.stats.defense * 1.15);
      scaledEnemy.stats.speed   = Math.floor(scaledEnemy.stats.speed   * 1.1);
    }

    // Reset move-use tracking for each new battle
    scaledEnemy.usedMoveNames = [];

    setEnemy({ ...scaledEnemy, isPlayer: false });
    const appearanceMsg = bossEnemy
      ? `⚡ LEGENDARY ${scaledEnemy.name.toUpperCase()} appeared! Floor ${targetFloor} Boss!`
      : miniBossEnemy
        ? `💀 Mini-Boss ${scaledEnemy.name} appeared on floor ${targetFloor}!`
        : `A wild ${scaledEnemy.name} appeared!`;
    setGameLog((prev: string[]) => [...prev, appearanceMsg].slice(-100));
  };

  const startGame = () => {
    setIsGameStarted('SELECT');
  };

  const selectStarterAndStart = async (starterId: number) => {
    const starter = await getRandomPokemon(starterId, true, 1);
    starter.moves = starter.moves.map(m => applyPPScale(m));
    starter.usedMoveNames = [];
    setPlayer({ ...starter, isPlayer: true });
    setFloor(1);
    setUpgrades([]);
    setGameLog(['Welcome to Poké-Rogue!', 'Choose a move to begin battle!']);
    setIsGameStarted('BATTLE');
    await spawnNewEnemy(1);
  };

  const onNextFloor = () => {
    const nextFloor = useGameStore.getState().floor + 1;
    setFloor(nextFloor);
    // Reset Last Resort tracking between floors (it's a per-battle mechanic)
    setPlayer((prev) => prev ? { ...prev, usedMoveNames: [] } : null);
    setGameLog((prev) => [...prev, `--- Floor ${nextFloor} ---`]);
    spawnNewEnemy(nextFloor);
  };

  const { handleEnemyDefeat, handleSelectUpgrade, handleReplaceMove, handleSkipMove } =
    useRewards(onNextFloor);

  const { handleMoveClick } = useCombat(handleEnemyDefeat);

  const gameOver = useGameStore((s) => {
    if (!s.player || !s.enemy) return false;
    return s.player.stats.hp <= 0 || s.enemy.stats.hp <= 0;
  });

  const winner = useGameStore((s) => {
    if (!s.player || !s.enemy) return null;
    if (s.player.stats.hp <= 0) return 'Enemy';
    if (s.enemy.stats.hp <= 0)  return 'Player';
    return null;
  });

  return {
    startGame,
    selectStarterAndStart,
    handleMoveClick,
    handleSelectUpgrade,
    handleReplaceMove,
    handleSkipMove,
    gameOver,
    winner,
    player,
    enemy,
  };
};