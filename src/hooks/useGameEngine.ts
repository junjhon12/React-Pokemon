// src/hooks/useGameEngine.ts
import { getRandomPokemon } from '../utils/api'; 
import { scaleEnemyStats } from '../utils/gameLogic';
import { useGameStore, type DungeonModifier, type GameState } from '../store/gameStore';
import { useRewards, applyPPScale } from './useRewards';
import { useCombat } from './useCombat';
import { type Pokemon } from '../types/pokemon';
import { type Upgrade } from '../types/upgrade';

export const useGameEngine = () => {
  const { player, enemy, floor } = useGameStore();

  const setPlayer = (val: Pokemon | null | ((p: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: Pokemon | null | ((e: Pokemon | null) => Pokemon | null)) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: boolean | ((t: boolean) => boolean)) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: string[] | ((l: string[]) => string[])) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setFloor = (val: number | ((f: number) => number)) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ floor: val(s.floor) }) : { floor: val });
  const setUpgrades = (val: Upgrade[] | ((u: Upgrade[]) => Upgrade[])) => useGameStore.setState(typeof val === 'function' ? (s: GameState) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });
  const setIsGameStarted = (val: 'START' | 'SELECT' | 'BATTLE') => useGameStore.setState({ isGameStarted: val });
  const setDungeonModifier = (mod: DungeonModifier) => useGameStore.setState({ dungeonModifier: mod });

  const spawnNewEnemy = async (targetFloor: number) => {
    setPlayerTurn(true);
    const bossEnemy = targetFloor % 10 === 0;
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const legendaryPokemonIds = [144, 145, 146, 150, 151]; 
    const pseudoLegendaryIds = [65, 94, 115, 130, 143, 149]; 

    // Roll Dungeon Modifiers
    if (targetFloor > 1 && targetFloor % 5 === 0) {
        const modifiers: DungeonModifier[] = ['volcanic', 'thick-fog', 'electric-terrain', 'hail'];
        const rolledMod = modifiers[Math.floor(Math.random() * modifiers.length)];
        setDungeonModifier(rolledMod);
        setGameLog((prev: string[]) => [...prev, `⚠️ DUNGEON MUTATED: ${rolledMod.toUpperCase()} ⚠️`]);
    } else if (targetFloor === 1 || targetFloor % 5 === 1) {
        setDungeonModifier('none'); // Clear it when moving to a normal floor
    }

    // FIX: Expanded early game array to 16 Pokemon, including Ground, Rock, and Water types
    const earlyGameIds = [10, 13, 16, 19, 21, 27, 29, 32, 37, 41, 43, 46, 50, 60, 69, 74];

    let randomId;
    if (bossEnemy) randomId = legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)];
    else if (miniBossEnemy) randomId = pseudoLegendaryIds[Math.floor(Math.random() * pseudoLegendaryIds.length)];
    else if (targetFloor <= 3) randomId = earlyGameIds[Math.floor(Math.random() * earlyGameIds.length)];
    else do { randomId = Math.floor(Math.random() * 151) + 1; } while (legendaryPokemonIds.includes(randomId) || pseudoLegendaryIds.includes(randomId));

    const newEnemy = await getRandomPokemon(randomId, false, targetFloor);
    const scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    if (bossEnemy) {
      scaledEnemy.stats.maxHp = Math.floor(scaledEnemy.stats.maxHp * 2.5); 
      scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.3); 
      scaledEnemy.stats.defense = Math.floor(scaledEnemy.stats.defense * 1.3); 
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.2);
    } else if (miniBossEnemy) {
      scaledEnemy.stats.maxHp = Math.floor(scaledEnemy.stats.maxHp * 1.5); 
      scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.15); 
      scaledEnemy.stats.defense = Math.floor(scaledEnemy.stats.defense * 1.15); 
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.1);
    }

    setEnemy({ ...scaledEnemy, isPlayer: false });
    const appearanceMsg = bossEnemy ? `A ${newEnemy.name} appears! It's a BOSS!` : miniBossEnemy ? `It's a ${newEnemy.name} ?! A Mini-Boss!` : `A wild ${newEnemy.name} appears!`;
    setGameLog((prev: string[]) => [...prev, appearanceMsg]);
  };

  const handleNextFloor = () => {
    const nextFloor = floor + 1;
    setFloor(nextFloor);
    spawnNewEnemy(nextFloor);
  };

  const { handleEnemyDefeat, handleSelectUpgrade, handleReplaceMove, handleSkipMove } = useRewards(handleNextFloor);
  const { handleMoveClick, executeEnemyTurn } = useCombat(handleEnemyDefeat);

  const startGame = () => setIsGameStarted('SELECT');

  const selectStarterAndStart = async (starterId: number) => {
    setFloor(1);
    setDungeonModifier('none');
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    // FIX: Match the initial enemy array with the new expanded earlyGameIds
    const earlyGameIds = [10, 13, 16, 19, 21, 27, 29, 32, 37, 41, 43, 46, 50, 60, 69, 74];
    const initialEnemyId = earlyGameIds[Math.floor(Math.random() * earlyGameIds.length)];
    const [p1, p2] = await Promise.all([getRandomPokemon(starterId, true, 1), getRandomPokemon(initialEnemyId, false, 1)]);

    const playerMon = { ...p1, isPlayer: true };
    if (playerMon.moves) playerMon.moves = playerMon.moves.map(applyPPScale);
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

  const gameOver = player?.stats.hp === 0 || enemy?.stats.hp === 0;
  const winner = enemy?.stats.hp === 0 ? 'Player' : 'Enemy';

  return { startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted, handleReplaceMove, handleSkipMove, gameOver, winner };
};