import { getRandomPokemon } from '../utils/api'; 
import { scaleEnemyStats } from '../utils/gameLogic';
import { useGameStore, type DungeonModifier } from '../store/gameStore';
import { useRewards, applyPPScale } from './useRewards';
import { useCombat } from './useCombat';

export const useGameEngine = () => {
  const { player, enemy, floor } = useGameStore();

  const setPlayer = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setFloor = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ floor: val(s.floor) }) : { floor: val });
  const setUpgrades = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });
  const setIsGameStarted = (val: 'START' | 'SELECT' | 'BATTLE') => useGameStore.setState({ isGameStarted: val });
  const setDungeonModifier = (mod: DungeonModifier) => useGameStore.setState({ dungeonModifier: mod });

  const spawnNewEnemy = async (targetFloor: number) => {
    setPlayerTurn(true);
    const bossEnemy = targetFloor % 10 === 0;
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const legendaryPokemonIds = [144, 145, 146, 150, 151]; 
    const pseudoLegendaryIds = [65, 94, 115, 130, 143, 149]; 

    // NEW: Roll Dungeon Modifiers
    if (targetFloor > 1 && targetFloor % 5 === 0) {
        const modifiers: DungeonModifier[] = ['volcanic', 'thick-fog', 'electric-terrain', 'hail'];
        const rolledMod = modifiers[Math.floor(Math.random() * modifiers.length)];
        setDungeonModifier(rolledMod);
        setGameLog((prev: string[]) => [...prev, `⚠️ DUNGEON MUTATED: ${rolledMod.toUpperCase()} ⚠️`]);
    } else if (targetFloor === 1 || targetFloor % 5 === 1) {
        setDungeonModifier('none'); // Clear it when moving to a normal floor
    }

    let randomId;
    if (bossEnemy) randomId = legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)];
    else if (miniBossEnemy) randomId = pseudoLegendaryIds[Math.floor(Math.random() * pseudoLegendaryIds.length)];
    else if (targetFloor <= 3) randomId = [10, 13, 16, 19, 21, 29, 32, 41, 43, 46, 69][Math.floor(Math.random() * 11)];
    else do { randomId = Math.floor(Math.random() * 151) + 1; } while (legendaryPokemonIds.includes(randomId) || pseudoLegendaryIds.includes(randomId));

    const newEnemy = await getRandomPokemon(randomId, false, targetFloor);
    const scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    if (bossEnemy) {
      scaledEnemy.stats.maxHp += 20; scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack += 3; scaledEnemy.stats.defense += 2; scaledEnemy.stats.speed += 2;
    } else if (miniBossEnemy) {
      scaledEnemy.stats.maxHp += 10; scaledEnemy.stats.hp = scaledEnemy.stats.maxHp;
      scaledEnemy.stats.attack += 1; scaledEnemy.stats.defense += 1; scaledEnemy.stats.speed += 1;
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

    const initialEnemyId = [10, 13, 16, 19, 21, 29, 32, 41, 43, 46, 69][Math.floor(Math.random() * 11)];
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