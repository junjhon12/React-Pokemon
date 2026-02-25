import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utils/api'; 
import type { Upgrade } from './types/upgrade';
import { getRandomUpgrades } from './utils/gameLogic';
import { scaleEnemyStats } from './utils/gameLogic';

function App() {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [floor, setFloor] = useState<number>(1);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);

  // ----------------------------------------------
  // 1. INITIALIZE GAME
  // ----------------------------------------------
  useEffect(() => {
    const initGame = async () => {
      const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
      const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

      const playerMon = { ...p1, isPlayer: true };
      const enemyMon = { ...p2, isPlayer: false };

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

  // ----------------------------------------------
  // 2. WATCH FOR ENEMY DEATH (Loot Trigger)
  // ----------------------------------------------
  useEffect(() => {
    // If enemy exists, has 0 HP, and we haven't already generated loot
    if (enemy && enemy.hp <= 0 && upgrades.length === 0) {
      const loot = getRandomUpgrades(3);
      setUpgrades(loot);
    }
  }, [enemy?.hp]); // Only run when HP changes

  // ----------------------------------------------
  // 3. ENEMY AI TURN
  // ----------------------------------------------
  useEffect(() => {
    if (playerTurn || !enemy || !player) return;
    if (enemy.hp <= 0 || player.hp <= 0) return;

    const turnTimer = setTimeout(() => {
      const damage = enemy.attack;

      setPlayer((prev) => {
        if (!prev) return null;
        return { ...prev, hp: Math.max(prev.hp - damage, 0) };
      });

      setGameLog((prev) => [...prev, `${enemy.name} attacked for ${damage} damage!`]);
      setPlayerTurn(true);
      
    }, 1000);

    return () => clearTimeout(turnTimer);
  }, [playerTurn, enemy, player]);


  // ----------------------------------------------
  // HELPER FUNCTIONS
  // ----------------------------------------------
  const spawnNewEnemy = async (floor: number) => {
    setEnemy(null); // Triggers loading state for enemy card
    setPlayerTurn(true);

    const randomId = Math.floor(Math.random() * 151) + 1;
    const newEnemy = await getRandomPokemon(randomId);

    const nextFloor = floor + 1; 
    const scaledEnemy = scaleEnemyStats(newEnemy, nextFloor);

    setEnemy({ ...scaledEnemy, isPlayer: false });
    setGameLog((prev) => [...prev, `--- FLOOR ${nextFloor} ---`, `A wild Level ${nextFloor} ${newEnemy.name} appears!`]);
  };

  const handleNextFloor = () => {
    setFloor((prev) => prev + 1);
    spawnNewEnemy(floor + 1); // Only spawn enemy, don't reset player
  };

  const handleSelectUpgrade = (upgrade: Upgrade) => {
    if (!player) return;

    // Apply Upgrade
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
      }
      return newStats;
    });

    setUpgrades([]); // Clear loot
    handleNextFloor(); // Go to next floor
  };

  const handleAttack = () => {
    if (!player || !enemy) return;
    const damage = player.attack;
    
    setEnemy((prev) => {
      if (!prev) return null;
      return { ...prev, hp: Math.max(prev.hp - damage, 0) };
    });

    setGameLog((prev) => [...prev, `${player.name} attacks ${enemy.name} for ${damage} damage!`]);
    setPlayerTurn(false);
  };

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------
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

      {/* CONDITIONAL RENDER: UPGRADES vs BATTLE */}
      {upgrades.length > 0 ? (
        // UPGRADE SCREEN
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
        // BATTLE SCREEN (Wrapped in Fragment <>)
        <>
          <div className='flex gap-10'>
            <PokemonCard pokemon={enemy} />
            <PokemonCard pokemon={player} />
          </div>

          <div className='flex flex-col items-center gap-4'>
            {gameOver ? (
              <div className='text-center animate-bounce'>
                <h2 className='text-3xl font-bold mb-2 text-yellow-400'>
                  {winner === 'Player' ? 'VICTORY!' : 'GAME OVER'}
                </h2>
                {/* NOTE: If Player wins, we don't show a button here because 
                  the UPGRADE screen above takes over immediately.
                  We only need the restart button if Player DIES.
                */}
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
                  <button 
                    onClick={handleAttack}
                    className='bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-full text-xl transition-all cursor-pointer'
                  >
                    ATTACK
                  </button>
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