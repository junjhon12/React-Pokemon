import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utils/api'; // Ensure this path is correct!
import type { Upgrade } from './types/upgrade';
import type { Move } from './types/move';
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness } from './utils/gameLogic';
import './App.css';

function App() {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [floor, setFloor] = useState<number>(1);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [playerAnimation, setPlayerAnimation] = useState<string>('');
  const [enemyAnimation, setEnemyAnimation] = useState<string>('');

  // 1. INITIALIZE GAME
  useEffect(() => {
    const initGame = async () => {
      const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
      const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

      // We don't need assignRandomMoves anymore! The API does it.
      let playerMon = { ...p1, isPlayer: true };
      let enemyMon = { ...p2, isPlayer: false };

      setPlayer(playerMon);
      setEnemy(enemyMon);

      if (p1.speed >= p2.speed) {
        setPlayerTurn(true);
        setGameLog((prev) => [...prev, `Battle Start! ${p1.name} moves first!`]);
      } else {
        setPlayerTurn(false);
        setGameLog((prev) => [...prev, `Battle Start! ${p2.name} is faster!`]);
      }
    };

    initGame();
  }, []);

  // 2. WATCH FOR ENEMY DEATH
  useEffect(() => {
    if (enemy && enemy.hp <= 0 && upgrades.length === 0) {
      const loot = getRandomUpgrades(3);
      setUpgrades(loot);
    }
  }, [enemy?.hp]);

  // 3. ENEMY AI
  useEffect(() => {
    if (playerTurn || !enemy || !player) return;
    if (enemy.hp <= 0 || player.hp <= 0) return;

    const turnTimer = setTimeout(() => {
      const enemyMoves = enemy.moves || [];
      const randomMove = enemyMoves.length > 0 
        ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
        : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

      // 1. Enemy Lunges LEFT
      setEnemyAnimation('animate-lunge-left');

      // 2. Delay for Impact
      setTimeout(() => {
        const effectiveness = getTypeEffectiveness(randomMove.type, player.types);
        const baseDamage = (enemy.attack * randomMove.power) / 50;
        const finalDamage = Math.floor(baseDamage * effectiveness);

        setPlayerAnimation('animate-shake'); // Player shakes
        setPlayer((prev) => {
          if (!prev) return null;
          return { ...prev, hp: Math.max(prev.hp - finalDamage, 0) };
        });

        let logMsg = `${enemy.name} used ${randomMove.name} for ${finalDamage} damage!`;
        if (effectiveness > 1) logMsg += " It's Super Effective!";
        setGameLog((prev) => [...prev, logMsg]);

        // 3. Cleanup
        setTimeout(() => {
          setEnemyAnimation('');
          setPlayerAnimation('');
          setPlayerTurn(true);
        }, 400);

      }, 300);
      
    }, 1000);

    return () => clearTimeout(turnTimer);
  }, [playerTurn, enemy, player]);



  // HELPER FUNCTIONS
  const spawnNewEnemy = async (floor: number) => {
    setEnemy(null);
    setPlayerTurn(true);

    const randomId = Math.floor(Math.random() * 151) + 1;
    const newEnemy = await getRandomPokemon(randomId);

    const nextFloor = floor + 1; 
    let scaledEnemy = scaleEnemyStats(newEnemy, nextFloor);

    setEnemy({ ...scaledEnemy, isPlayer: false });
    setGameLog((prev) => [...prev, `--- FLOOR ${nextFloor} ---`, `A wild Level ${nextFloor} ${newEnemy.name} appears!`]);
  };

  const handleNextFloor = () => {
    setFloor((prev) => prev + 1);
    spawnNewEnemy(floor + 1);
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    if (!player) return;
    setPlayer((prev) => {
      if (!prev) return null;
      let newStats = { ...prev };
      if (upgrade.stat === 'hp') {
        newStats.hp = Math.min(prev.hp + upgrade.amount, prev.maxHp);
      } else if (upgrade.stat === 'maxHp') {
        newStats.maxHp += upgrade.amount;
        newStats.hp += upgrade.amount;
      } else {
        // @ts-ignore
        newStats[upgrade.stat] += upgrade.amount;
        newStats.level = (newStats.level || 1) + 1;
      }
      return newStats;
    });
    setUpgrades([]);
    handleNextFloor();
  };

  const handleMoveClick = (move: Move) => {
    if (!player || !enemy) return;

    setPlayerAnimation('animate-lunge-right');

    // 1. Accuracy Check
    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      setTimeout(() => {
        setGameLog((prev) => [...prev, `${player.name} used ${move.name} but missed!`]);
        setPlayerAnimation(''); // Reset
        setPlayerTurn(false);
      }, 500); // Small delay for the animation to finish
      return;
    }

    const effectiveness = getTypeEffectiveness(move.type, enemy.types);
    const baseDamage = (player.attack * move.power) / 50;
    const finalDamage = Math.floor(baseDamage * effectiveness);

    setTimeout(() => {
      setEnemyAnimation('animate-shake'); // Enemy shakes
      setEnemy((prev) => {
        if (!prev) return null;
        return { ...prev, hp: Math.max(prev.hp - finalDamage, 0) };
      });

      let logMsg = `${player.name} used ${move.name} for ${finalDamage} damage!`;
      if (effectiveness > 1) logMsg += " It's Super Effective!";
      setGameLog((prev) => [...prev, logMsg]);

      // 5. Cleanup after shake finishes
      setTimeout(() => {
        setPlayerAnimation('');
        setEnemyAnimation('');
        setPlayerTurn(false);
      }, 400); 

    }, 300); // Lunge Duration
  };

  // RENDER
  if (!player || !enemy) {
    return (
      <div className="min-h-screen w-screen bg-black text-white flex justify-center items-center">
        <h1 className="text-2xl animate-pulse">Loading Battle...</h1>
      </div>
    );
  }

  const gameOver = player.hp === 0 || enemy.hp === 0;
  const winner = enemy.hp === 0 ? 'Player' : 'Enemy';

  return (
    <div className='min-h-screen w-screen bg-black text-white flex flex-col justify-center items-center gap-10'>
      <h1 className="text-4xl font-bold text-yellow-400 tracking-widest">
        FLOOR {floor}
      </h1>

      {upgrades.length > 0 ? (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-3xl font-bold text-yellow-400">CHOOSE YOUR REWARD</h2>
          <div className="flex gap-4">
            {upgrades.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUpgrade(u)}
                className="bg-slate-800 border-2 border-yellow-500 p-6 rounded-xl hover:bg-slate-700 transition-all hover:scale-105 w-48 flex flex-col items-center gap-2 cursor-pointer"
              >
                <span className="text-xl font-bold text-white">{u.name}</span>
                <span className="text-sm text-gray-300 text-center">{u.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-10'>
            <PokemonCard pokemon={enemy} animation={enemyAnimation} />
            <PokemonCard pokemon={player} animation={playerAnimation} />
          </div>

          <div className='flex flex-col items-center gap-4'>
            {gameOver ? (
              <div className='text-center animate-bounce'>
                <h2 className='text-3xl font-bold mb-2 text-yellow-400'>
                  {winner === 'Player' ? 'VICTORY!' : 'GAME OVER'}
                </h2>
                {winner === 'Enemy' && (
                  <button 
                    onClick={() => window.location.reload()}
                    className='bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg cursor-pointer'
                  >
                    Restart Run
                  </button>
                )}
              </div>
            ) : (
              <>
                {playerTurn ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* UPDATED TO USE 'moves' (Plural) */}
                    {player.moves?.map((move, index) => (
                      <button
                        key={index}
                        onClick={() => handleMoveClick(move)}
                        className="bg-slate-800 border-2 border-slate-600 hover:border-yellow-400 text-white p-4 rounded-lg w-40 transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="font-bold text-lg">{move.name}</div>
                        <div className="text-xs text-slate-400 flex justify-between mt-1">
                          <span>{move.type.toUpperCase()}</span>
                          <span>PWR {move.power}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className='text-gray-400 italic text-xl'>Enemy is thinking...</p>
                )}
              </>
            )}

            <div className='bg-slate-900 border-2 border-slate-700 p-4 rounded-lg w-96 h-32 overflow-y-auto font-mono text-sm'>
              {gameLog.map((log, i) => (
                <p key={i} className='border-b border-slate-800 pb-1 mb-1'>{log}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;