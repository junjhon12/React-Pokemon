import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utils/api'; 
import type { Upgrade } from './types/upgrade';
import type { Move } from './types/move';
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP } from './utils/gameLogic';
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
      if (player) {
        const xpGain = (enemy.level || 1) * 50; 
        let newPlayer = { ...player };
        const currentXp = newPlayer.xp || 0;
        const currentMaxXp = newPlayer.maxXp || 100;
        let totalXp = currentXp + xpGain;

        if (totalXp >= currentMaxXp) {
          const overflow = totalXp - currentMaxXp;
          newPlayer = handleLevelUp(newPlayer, overflow);
          setGameLog(prev => [...prev, `Level Up! You are now Lvl ${newPlayer.level}!`]);
        } else {
          newPlayer.xp = totalXp;
          setGameLog(prev => [...prev, `You gained ${xpGain} XP.`]);
        }
        setPlayer(newPlayer);
      }
      const loot = getRandomUpgrades(3, player?.id);
      setUpgrades(loot);
    }
  }, [enemy?.hp]);

  // 5. ENEMY AI
  useEffect(() => {
    if (playerTurn || !enemy || !player) return;
    if (enemy.hp <= 0 || player.hp <= 0) return;

    const turnTimer = setTimeout(() => {
      if (enemy.status === 'freeze') {
        if (Math.random() < 0.2) {
          setGameLog(prev => [...prev, `${enemy.name} thawed out!`]);
          setEnemy(e => e ? { ...e, status: 'normal' } : null);
        } else {
          setGameLog(prev => [...prev, `${enemy.name} is frozen solid!`]);
          setPlayerTurn(true);
          return;
        }
      } else if (enemy.status === 'paralyze' && Math.random() < 0.25) {
        setGameLog(prev => [...prev, `${enemy.name} is paralyzed! It can't move!`]);
        setPlayerTurn(true);
        return;
      }

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
        
        let appliedStatus = player.status;
        let statusLog = '';
        if (randomMove.statusEffect && (!player.status || player.status === 'normal')) {
          if (randomMove.power === 0 || Math.random() < 0.3) {
            if (randomMove.statusEffect !== 'stunned') {
              appliedStatus = randomMove.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze';
              statusLog = ` ${player.name} was inflicted with ${randomMove.statusEffect}!`;
            }
          }
        }

        setPlayer((prev) => {
          if (!prev) return null;
          return { ...prev, hp: Math.max(prev.hp - finalDamage, 0), status: appliedStatus };
        });

        let logMsg = `${enemy.name} used ${randomMove.name} for ${finalDamage} damage!`;
        if (effectiveness > 1) logMsg += " It's Super Effective!";
        if (statusLog) logMsg += statusLog;

        if (enemy.status === 'burn' || enemy.status === 'poison') {
          const tickDamage = Math.max(1, Math.floor(enemy.maxHp * 0.1));
          setEnemy(e => e ? { ...e, hp: Math.max(e.hp - tickDamage, 0) } : null);
          logMsg += ` ${enemy.name} took ${tickDamage} damage from its ${enemy.status}!`;
        }

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

    const bossEnemy = targetFloor % 10 === 0;
    const legendaryPokemonIds = [144, 145, 146, 150]; 
    const miniBossEnemy = targetFloor % 5 === 0 && !bossEnemy;
    const pseduoLegendaryIds = [65, 94, 115, 248]; 
    const randomId = bossEnemy ? legendaryPokemonIds[Math.floor(Math.random() * legendaryPokemonIds.length)] :
                     miniBossEnemy ? pseduoLegendaryIds[Math.floor(Math.random() * pseduoLegendaryIds.length)] :
                     Math.floor(Math.random() * 151) + 1;
    const newEnemy = await getRandomPokemon(randomId);

    let scaledEnemy = scaleEnemyStats(newEnemy, targetFloor);

    if (bossEnemy) {
      scaledEnemy.hp = Math.floor(scaledEnemy.hp * 1.5);
      scaledEnemy.attack = Math.floor(scaledEnemy.attack * 1.5);
      scaledEnemy.speed = Math.floor(scaledEnemy.speed * 1.5);
    } else if (miniBossEnemy) {
      scaledEnemy.hp = Math.floor(scaledEnemy.hp * 1.2);
      scaledEnemy.attack = Math.floor(scaledEnemy.attack * 1.2);
      scaledEnemy.speed = Math.floor(scaledEnemy.speed * 1.2);
    }

    setEnemy({ ...scaledEnemy, isPlayer: false });

    if(bossEnemy) {
      setGameLog(prev => [...prev, `A ${newEnemy.name} appears! It's a BOSS!`]);
    } else if (miniBossEnemy) {
      setGameLog(prev => [...prev, `It's a ${newEnemy.name} ?! A Mini-Boss!`]);
    } else {
      setGameLog(prev => [...prev, `A wild ${newEnemy.name} appears!`]);
    }
  };

  const handleNextFloor = () => {
    const nextFloor = floor + 1;
    setFloor(nextFloor);
    spawnNewEnemy(nextFloor);
  };

  const handleSelectUpgrade = async (upgrade: Upgrade) => {
    if (!player) return;
    if (upgrade.stat === 'evolve') {
      // @ts-ignore
      const nextId = EVOLUTION_MAP ? EVOLUTION_MAP[player.id] : player.id + 1; 
      const evolvedBase = await getRandomPokemon(nextId);
      const currentLevel = player.level || 1;
      const scaledEvolved = scaleEnemyStats(evolvedBase, currentLevel);
      setPlayer({
        ...scaledEvolved,
        isPlayer: true,
        xp: player.xp,
        maxXp: player.maxXp
      });
      setGameLog(prev => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`]);
    } else {
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
    }
    setUpgrades([]);
    handleNextFloor();
  };

  const handleMoveClick = (move: Move) => {
    if (!player || !enemy) return;

    if (player.status === 'freeze') {
      if (Math.random() < 0.2) {
        setGameLog(prev => [...prev, `${player.name} thawed out!`]);
        setPlayer(p => p ? { ...p, status: 'normal' } : null);
      } else {
        setGameLog(prev => [...prev, `${player.name} is frozen solid!`]);
        setPlayerTurn(false);
        return;
      }
    } else if (player.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog(prev => [...prev, `${player.name} is paralyzed! It can't move!`]);
      setPlayerTurn(false);
      return;
    }

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
      
      let appliedStatus = enemy.status;
      let statusLog = '';
      if (move.statusEffect && (!enemy.status || enemy.status === 'normal')) {
        if (move.power === 0 || Math.random() < 0.3) {
          if (move.statusEffect !== 'stunned') {
            appliedStatus = move.statusEffect as 'burn' | 'poison' | 'paralyze' | 'freeze';
            statusLog = ` ${enemy.name} was inflicted with ${move.statusEffect}!`;
          }
        }
      }

      setEnemy((prev) => {
        if (!prev) return null;
        return { ...prev, hp: Math.max(prev.hp - finalDamage, 0), status: appliedStatus };
      });

      let logMsg = `${player.name} used ${move.name} for ${finalDamage} damage!`;
      if (effectiveness > 1) logMsg += " It's Super Effective!";
      if (statusLog) logMsg += statusLog;

      if (player.status === 'burn' || player.status === 'poison') {
        const tickDamage = Math.max(1, Math.floor(player.maxHp * 0.1));
        setPlayer(p => p ? { ...p, hp: Math.max(p.hp - tickDamage, 0) } : null);
        logMsg += ` ${player.name} took ${tickDamage} damage from its ${player.status}!`;
      }

      setGameLog((prev) => [...prev, logMsg]);

      setTimeout(() => {
        setPlayerAnimation('');
        setEnemyAnimation('');
        setPlayerTurn(false);
      }, 400); 

    }, 300); 
  };

  const handleLevelUp = (currentStats: Pokemon, overflowXp: number) => {
    const newLevel = (currentStats.level || 1) + 1;
    const growthRate = 0.1; 
    const newMaxHp = Math.floor(currentStats.maxHp * (1 + growthRate));
    const newAttack = Math.floor(currentStats.attack * (1 + growthRate));
    const newSpeed = Math.floor(currentStats.speed * (1 + growthRate));
    const newMaxXp = Math.floor((currentStats.maxXp || 100) * 1.2);

    return {
      ...currentStats,
      level: newLevel,
      maxHp: newMaxHp,
      hp: newMaxHp,
      attack: newAttack,
      speed: newSpeed,
      xp: overflowXp,
      maxXp: newMaxXp
    };
  };

  const gameOver = player?.hp === 0 || enemy?.hp === 0;
  const winner = enemy?.hp === 0 ? 'Player' : 'Enemy';

  return (
    <div className='min-h-screen w-screen bg-black flex items-center justify-center font-mono p-4'>
      
      {!isGameStarted ? (
        <div className="text-center space-y-8 text-white">
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
        </div>
      ) : (
        /* --- RETRO RPG DASHBOARD LAYOUT --- */
        <div className='w-full max-w-6xl h-[800px] flex bg-white border-4 border-black rounded-lg overflow-hidden shadow-2xl'>
          
          {/* LEFT PANEL: Player Dashboard */}
          <div className='w-[400px] bg-[#d3d3d3] flex flex-col border-r-4 border-black shrink-0 text-black'>
            
            {/* Top Stats Area */}
            <div className='p-6 flex-1'>
              {player && (
                <>
                  <h2 className='text-3xl font-black uppercase mb-4 border-b-4 border-black pb-2'>
                    {player.name}
                  </h2>
                  <div className='space-y-2 text-lg font-bold border-b-4 border-black pb-4 mb-4'>
                    <div className='flex justify-between'>
                      <span className='text-red-700'>❤️ Health</span>
                      <span>{player.hp}/{player.maxHp}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-orange-700'>👊 Attack</span>
                      <span>{player.attack}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-blue-700'>⚡ Speed</span>
                      <span>{player.speed}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-purple-700'>✨ Types</span>
                      <span className='uppercase text-sm'>{player.types.join('/')}</span>
                    </div>
                  </div>

                  {/* Visual Inventory Bag */}
                  <div className='mt-4'>
                    <p className='text-md font-bold mb-2 flex items-center gap-2'>
                       Poké Ball Bag
                    </p>
                    <div className='grid grid-cols-7 gap-1'>
                      {[...Array(21)].map((_, i) => (
                        <div key={i} className='w-full aspect-square bg-gray-400 border border-gray-500 rounded-sm shadow-inner'></div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Left Moves Area */}
            <div className='h-[250px] bg-[#1a1a24] p-4 flex flex-col justify-end border-t-4 border-black'>
              {(!player || !enemy) ? null : playerTurn ? (
                <div className="grid grid-cols-2 gap-2 h-full">
                  {player.moves?.map((move, index) => (
                    <button
                      key={index}
                      onClick={() => handleMoveClick(move)}
                      className="bg-transparent border-2 border-white hover:bg-white hover:text-black text-white font-bold uppercase text-sm rounded transition-all active:scale-95 flex flex-col items-center justify-center p-2 cursor-pointer"
                    >
                      <span className="text-lg mb-1 text-center leading-tight">{move.name}</span>
                      <span className="text-[10px] opacity-70">{move.type}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className='text-red-500 font-bold text-xl animate-pulse'>ENEMY TURN</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: The Arena & Logs */}
          <div className='flex-1 flex flex-col relative bg-[#1a1a24]'>
            
            {/* Top Header Bar */}
            <div className='h-12 bg-[#b31429] flex items-center px-6 justify-between border-b-4 border-black'>
              <h1 className='text-white font-black text-xl tracking-widest uppercase'>
                {floor % 10 === 0 ? `BOSS ROOM ${floor}` : floor % 5 === 0 ? `MINI-BOSS ${floor}` : `ROOM ${floor}`}
              </h1>
              <span className="text-gray-200 font-bold text-sm">AREA {Math.ceil(floor/5)}</span>
            </div>

            {/* Main Arena Display */}
            <div className='flex-1 relative bg-gradient-to-b from-[#87ceeb] to-[#90ee90] overflow-hidden border-b-4 border-black'>
              
              {/* Game Log Overlay (Top of Arena) */}
              <div className='absolute top-0 left-0 w-full h-32 bg-black/80 text-green-400 p-4 overflow-y-auto text-sm font-mono z-30'>
                {gameLog.map((log, i) => (
                  <p key={i} className="mb-1">{log}</p>
                ))}
              </div>

              {/* OVERLAYS: Loot & Game Over */}
              {upgrades.length > 0 && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
                  <h2 className="text-3xl font-black text-yellow-400 mb-8">CHOOSE REWARD</h2>
                  <div className="flex gap-4">
                    {upgrades.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUpgrade(u)}
                        className="bg-gray-800 border-2 border-yellow-500 p-4 rounded-xl hover:bg-gray-700 transition-all text-white w-48 flex flex-col items-center cursor-pointer"
                      >
                        <span className="text-xl font-bold text-center">{u.name}</span>
                        <span className="text-xs text-gray-300 text-center mt-2">{u.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {gameOver && upgrades.length === 0 && (
                <div className='absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center'>
                  <h2 className='text-6xl font-black mb-6 text-yellow-400'>
                    {winner === 'Player' ? 'VICTORY!' : 'GAME OVER'}
                  </h2>
                  {winner === 'Enemy' && (
                    <button 
                      onClick={() => setIsGameStarted(false)}
                      className='bg-red-600 hover:bg-red-700 border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-xl cursor-pointer'
                    >
                      Finish Run
                    </button>
                  )}
                </div>
              )}

              {/* SPRITES AND FLOATING INFO BARS */}
              {player && enemy && (
                <>
                  {/* Enemy (Top Right) */}
                  <div className={`absolute top-40 right-10 flex items-center gap-4 z-10 ${enemyAnimation}`}>
                    <PokemonCard pokemon={enemy} />
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
                      alt={enemy.name}
                      className="w-48 h-48 pixelated drop-shadow-xl"
                    />
                  </div>

                  {/* Player (Bottom Left) */}
                  <div className={`absolute bottom-10 left-10 flex items-center gap-4 z-20 ${playerAnimation}`}>
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
                      alt={player.name}
                      className="w-56 h-56 pixelated drop-shadow-xl"
                    />
                    <PokemonCard pokemon={player} />
                  </div>
                </>
              )}
            </div>

            {/* Bottom Right Panel (Action Detail) */}
            <div className='h-[150px] bg-[#1a1a24] p-6 text-white'>
              <h2 className='text-2xl font-black text-red-500 uppercase border-b-2 border-gray-700 pb-2 mb-2'>
                 Combat Status
              </h2>
              <p className='text-lg text-gray-300'>
                 {playerTurn ? 'Select a move from the left panel...' : 'Enemy is preparing to attack...'}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;