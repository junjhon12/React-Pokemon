import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utils/api'; 
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
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(0);

  // 1. LOAD HIGH SCORE
  useEffect(() => {
    const savedScore = localStorage.getItem('rogue-score');
    if (savedScore) {
      setHighScore(parseInt(savedScore));
    }
  }, []);

  // 2. SAVE HIGH SCORE ON DEATH
  useEffect(() => {
    if (player && player.hp === 0) {
      if (floor > highScore) {
        setHighScore(floor);
        localStorage.setItem('rogue-score', floor.toString());
      }
    }
  }, [player?.hp]);

  // 3. START GAME LOGIC
  const startGame = async () => {
    setIsGameStarted(true);
    setFloor(1);
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
    const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

    const playerMon = { ...p1, isPlayer: true };
    const enemyMon = { ...p2, isPlayer: false };

    setPlayer(playerMon);
    setEnemy(enemyMon);

    if (p1.speed >= p2.speed) {
      setPlayerTurn(true);
      setGameLog((prev) => [...prev, `${p1.name} moves first!`]);
    } else {
      setPlayerTurn(false);
      setGameLog((prev) => [...prev, `${p2.name} is faster!`]);
    }
  };

  // 4. WATCH FOR ENEMY DEATH (Loot Trigger)
  useEffect(() => {
    if (enemy && enemy.hp <= 0 && upgrades.length === 0) {
      const loot = getRandomUpgrades(3);
      setUpgrades(loot);
    }
  }, [enemy?.hp]);

  // 5. ENEMY AI
  useEffect(() => {
    if (playerTurn || !enemy || !player) return;
    if (enemy.hp <= 0 || player.hp <= 0) return;

    const turnTimer = setTimeout(() => {
      const enemyMoves = enemy.moves || [];
      const randomMove = enemyMoves.length > 0 
        ? enemyMoves[Math.floor(Math.random() * enemyMoves.length)]
        : { name: 'Tackle', power: 40, accuracy: 100, type: 'normal' } as Move;

      setEnemyAnimation('animate-lunge-left');

      setTimeout(() => {
        const effectiveness = getTypeEffectiveness(randomMove.type, player.types);
        const baseDamage = (enemy.attack * randomMove.power) / 50;
        const finalDamage = Math.floor(baseDamage * effectiveness);

        setPlayerAnimation('animate-shake');
        setPlayer((prev) => {
          if (!prev) return null;
          return { ...prev, hp: Math.max(prev.hp - finalDamage, 0) };
        });

        let logMsg = `${enemy.name} used ${randomMove.name} for ${finalDamage} damage!`;
        if (effectiveness > 1) logMsg += " It's Super Effective!";
        setGameLog((prev) => [...prev, logMsg]);

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
  const spawnNewEnemy = async (targetFloor: number) => {
    setEnemy(null);
    setPlayerTurn(true);

    const randomId = Math.floor(Math.random() * 151) + 1;
    const newEnemy = await getRandomPokemon(randomId);

    // FIX: Use targetFloor directly, don't add +1 again
    let scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    setEnemy({ ...scaledEnemy, isPlayer: false });
    setGameLog((prev) => [...prev, `--- FLOOR ${targetFloor} ---`, `A wild Level ${targetFloor} ${newEnemy.name} appears!`]);
  };

  const handleNextFloor = () => {
    const nextFloor = floor + 1;
    setFloor(nextFloor);
    spawnNewEnemy(nextFloor);
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
        newStats[upgrade.stat] += upgrade.amount;
      }
      return newStats;
    });
    setUpgrades([]);
    handleNextFloor();
  };

  const handleMoveClick = (move: Move) => {
    if (!player || !enemy) return;

    setPlayerAnimation('animate-lunge-right');

    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      setTimeout(() => {
        setGameLog((prev) => [...prev, `${player.name} used ${move.name} but missed!`]);
        setPlayerAnimation(''); 
        setPlayerTurn(false);
      }, 500); 
      return;
    }

    const effectiveness = getTypeEffectiveness(move.type, enemy.types);
    const baseDamage = (player.attack * move.power) / 50;
    const finalDamage = Math.floor(baseDamage * effectiveness);

    setTimeout(() => {
      setEnemyAnimation('animate-shake'); 
      setEnemy((prev) => {
        if (!prev) return null;
        return { ...prev, hp: Math.max(prev.hp - finalDamage, 0) };
      });

      let logMsg = `${player.name} used ${move.name} for ${finalDamage} damage!`;
      if (effectiveness > 1) logMsg += " It's Super Effective!";
      setGameLog((prev) => [...prev, logMsg]);

      setTimeout(() => {
        setPlayerAnimation('');
        setEnemyAnimation('');
        setPlayerTurn(false);
      }, 400); 

    }, 300); 
  };

  // RENDER
  const gameOver = player?.hp === 0 || enemy?.hp === 0;
  const winner = enemy?.hp === 0 ? 'Player' : 'Enemy';

  return (
    <div className='min-h-screen w-screen bg-black text-white flex flex-col justify-center items-center font-mono'>
      
      {!isGameStarted ? (
        /* --- TITLE SCREEN --- */
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold text-yellow-400 tracking-tighter animate-pulse">
            POKÉ-ROGUE
          </h1>
          
          <div className="border-4 border-slate-700 p-8 rounded-xl bg-slate-900">
            <p className="text-slate-400 mb-2">BEST RUN</p>
            <p className="text-4xl text-green-400 font-bold">FLOOR {highScore}</p>
          </div>

          <button 
            onClick={startGame}
            className="bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-4 px-12 rounded-full border-4 border-red-800 shadow-lg hover:scale-105 transition-all cursor-pointer"
          >
            START RUN
          </button>

          <p className="text-slate-500 text-sm">v1.0.0 • React • Tailwind • PokeAPI</p>
        </div>
      ) : (
        /* --- THE GAME --- */
        <div className='flex flex-col items-center gap-10 w-full max-w-4xl'>
           
           <h1 className="text-4xl font-bold text-yellow-400 tracking-widest">
             FLOOR {floor}
           </h1>

           {(!player || !enemy) ? (
              <h1 className="text-2xl animate-pulse">Summoning Monsters...</h1>
           ) : (
             /* --- BATTLE CONTENT REPLACED HERE --- */
             <>
               {upgrades.length > 0 ? (
                /* LOOT SCREEN */
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
                /* BATTLE SCREEN */
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
                            onClick={() => setIsGameStarted(false)}
                            className='bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg cursor-pointer'
                          >
                            Return to Menu
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {playerTurn ? (
                          <div className="grid grid-cols-2 gap-4">
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
             </>
           )}
        </div>
      )}
    </div>
  );
}

export default App;