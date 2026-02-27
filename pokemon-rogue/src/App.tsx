import { PokemonCard } from './components/PokemonCard';
import { StartScreen } from './components/StartScreen'; // NEW
import { LootOverlay } from './components/LootOverlay'; // NEW
import { PlayerDashboard } from './components/PlayerDashboard'; // NEW
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon, fetchEquipmentFromPokeAPI } from './utils/api'; 
import type { Upgrade } from './types/upgrade';
import type { Move } from './types/move';
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP, getEffectiveStat } from './utils/gameLogic';
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

  useEffect(() => {
    const savedScore = localStorage.getItem('rogue-score');
    if (savedScore) {
      setHighScore(parseInt(savedScore));
    }
  }, []);

  useEffect(() => {
    if (player && player.stats.hp === 0) {
      if (floor > highScore) {
        setHighScore(floor);
        localStorage.setItem('rogue-score', floor.toString());
      }
    }
  }, [player?.stats.hp]);

  // NOTE: Remove getEffectiveStat from here, as we moved it to gameLogic.ts!

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

    if (p1.stats.speed >= p2.stats.speed) {
      setPlayerTurn(true);
      setGameLog((prev) => [...prev, `${p1.name} moves first!`]);
    } else {
      setPlayerTurn(false);
      setGameLog((prev) => [...prev, `${p2.name} is faster!`]);
    }
  };

  useEffect(() => {
    if (enemy && enemy.stats.hp <= 0 && upgrades.length === 0) {
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
      
      const fetchLoot = async () => {
        const baseLoot = getRandomUpgrades(2, player?.id);

        if (floor % 1 === 0) {
          const ITEM_POOL = ['muscle-band', 'iron-ball', 'scope-lens', 'bright-powder', 'leftovers'];
          const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
          const equipment = await fetchEquipmentFromPokeAPI(randomItemName);
          
          if (equipment) {
            baseLoot.push({
              id: equipment.id,
              name: equipment.name,
              description: equipment.description,
              stat: 'equipment',
              amount: 0,
              equipment: equipment
            });
          }
        } else {
          const extra = getRandomUpgrades(1)[0];
          extra.id = Math.random().toString();
          baseLoot.push(extra);
        }
        setUpgrades(baseLoot);
      };

      fetchLoot();
    }
  }, [enemy?.stats.hp]);

  useEffect(() => {
    if (playerTurn || !enemy || !player) return;
    if (enemy.stats.hp <= 0 || player.stats.hp <= 0) return;

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
        const playerDodge = getEffectiveStat(player, 'dodge');
        if ((Math.random() * 100) < playerDodge) {
          setGameLog((prev) => [...prev, `${player.name} dodged the attack!`]);
          setEnemyAnimation('');
          setPlayerAnimation('');
          setPlayerTurn(true);
          return;
        }

        const enemyCrit = getEffectiveStat(enemy, 'critChance');
        const isCrit = (Math.random() * 100) < enemyCrit;
        const critMultiplier = isCrit ? 1.5 : 1;

        const effectiveness = getTypeEffectiveness(randomMove.type, player.types);
        
        const playerDef = getEffectiveStat(player, 'defense');
        const defenseMitigation = 100 / (100 + playerDef);
        const enemyAtk = getEffectiveStat(enemy, 'attack');
        const baseDamage = (enemyAtk * randomMove.power) / 50;
        const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * critMultiplier));

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
          return { ...prev, stats: { ...prev.stats, hp: Math.max(prev.stats.hp - finalDamage, 0) }, status: appliedStatus };
        });

        let logMsg = `${enemy.name} used ${randomMove.name} for ${finalDamage} damage!`;
        if (isCrit) logMsg += " A Critical Hit!";
        if (effectiveness > 1) logMsg += " It's Super Effective!";
        if (statusLog) logMsg += statusLog;

        if (enemy.status === 'burn' || enemy.status === 'poison') {
          const tickDamage = Math.max(1, Math.floor(enemy.stats.maxHp * 0.1));
          setEnemy(e => e ? { ...e, stats: { ...e.stats, hp: Math.max(e.stats.hp - tickDamage, 0) } } : null);
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
      scaledEnemy.stats.hp = Math.floor(scaledEnemy.stats.hp * 1.5);
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.5);
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.5);
    } else if (miniBossEnemy) {
      scaledEnemy.stats.hp = Math.floor(scaledEnemy.stats.hp * 1.2);
      scaledEnemy.stats.attack = Math.floor(scaledEnemy.stats.attack * 1.2);
      scaledEnemy.stats.speed = Math.floor(scaledEnemy.stats.speed * 1.2);
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

    if (upgrade.stat === 'equipment' && upgrade.equipment) {
      setPlayer({ ...player, heldItem: upgrade.equipment });
      setGameLog(prev => [...prev, `Equipped ${upgrade.equipment!.name}!`, `Stat bonuses applied dynamically.`]);
      setUpgrades([]);
      handleNextFloor();
      return;
    }

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
        maxXp: player.maxXp,
        heldItem: player.heldItem
      });
      setGameLog(prev => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`]);
    } else {
      setPlayer((prev) => {
        if (!prev) return null;

        // @ts-ignore
        const targetStat = upgrade.stat; 
        const newStats = {
          ...prev.stats,
          [targetStat]: prev.stats[targetStat] + upgrade.amount
        };

        if (targetStat === 'hp') {
          newStats.hp = Math.min(newStats.hp, prev.stats.maxHp);
        }

        return { ...prev, stats: newStats };
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

    setTimeout(() => {
      const enemyDodge = getEffectiveStat(enemy, 'dodge');
      if ((Math.random() * 100) < enemyDodge) {
        setGameLog((prev) => [...prev, `${enemy.name} dodged the attack!`]);
        setPlayerAnimation(''); 
        setPlayerTurn(false);
        return;
      }

      const playerCrit = getEffectiveStat(player, 'critChance');
      const isCrit = (Math.random() * 100) < playerCrit;
      const critMultiplier = isCrit ? 1.5 : 1; 

      const effectiveness = getTypeEffectiveness(move.type, enemy.types);
      
      const enemyDef = getEffectiveStat(enemy, 'defense');
      const defenseMitigation = 100 / (100 + enemyDef);
      const playerAtk = getEffectiveStat(player, 'attack');
      const baseDamage = (playerAtk * move.power) / 50;
      const finalDamage = Math.max(1, Math.floor(baseDamage * effectiveness * defenseMitigation * critMultiplier));

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
        return { 
          ...prev, 
          stats: { 
            ...prev.stats, 
            hp: Math.max(prev.stats.hp - finalDamage, 0) 
          }, 
          status: appliedStatus 
        };
      });

      let logMsg = `${player.name} used ${move.name} for ${finalDamage} damage!`;
      if (isCrit) logMsg += " A Critical Hit!";
      if (effectiveness > 1) logMsg += " It's Super Effective!";
      if (statusLog) logMsg += statusLog;

      if (player.status === 'burn' || player.status === 'poison') {
        const tickDamage = Math.max(1, Math.floor(player.stats.maxHp * 0.1));
        setPlayer(p => p ? { ...p, stats: { ...p.stats, hp: Math.max(p.stats.hp - tickDamage, 0) } } : null);
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
    const newMaxHp = Math.floor(currentStats.stats.maxHp * (1 + growthRate));
    const newAttack = Math.floor(currentStats.stats.attack * (1 + growthRate));
    const newSpeed = Math.floor(currentStats.stats.speed * (1 + growthRate));
    const newMaxXp = Math.floor((currentStats.maxXp || 100) * 1.2);

    return {
      ...currentStats,
      level: newLevel,
      stats: {
        ...currentStats.stats,
        maxHp: newMaxHp,
        hp: newMaxHp,
        attack: newAttack,
        speed: newSpeed
      },
      xp: overflowXp,
      maxXp: newMaxXp
    };
  };

  const gameOver = player?.stats.hp === 0 || enemy?.stats.hp === 0;
  const winner = enemy?.stats.hp === 0 ? 'Player' : 'Enemy';

  return (
    <div className='min-h-screen w-screen bg-black flex items-center justify-center font-mono p-4'>
      
      {!isGameStarted ? (
        <StartScreen highScore={highScore} startGame={startGame} />
      ) : (
        /* --- RETRO RPG DASHBOARD LAYOUT --- */
        <div className='w-full max-w-6xl h-[800px] flex bg-white border-4 border-black rounded-lg overflow-hidden shadow-2xl'>
          
          {/* LEFT PANEL: Player Dashboard */}
          {player && (
            <PlayerDashboard 
              player={player} 
              enemy={enemy} 
              playerTurn={playerTurn} 
              handleMoveClick={handleMoveClick} 
            />
          )}

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
              <LootOverlay upgrades={upgrades} handleSelectUpgrade={handleSelectUpgrade} />

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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;