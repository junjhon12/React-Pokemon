import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon, type StatKey } from './types/pokemon';
import { getRandomPokemon, fetchEquipmentFromPokeAPI } from './utils/api'; 
import type { Upgrade } from './types/upgrade';
import type { Move } from './types/move';
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP } from './utils/gameLogic';
import './App.css';

const TYPE_SYMBOLS: Record<string, string> = {
  normal: '⚪', fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  ice: '❄️', fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🦅',
  psychic: '🔮', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉',
  dark: '🌙', steel: '⚙️', fairy: '✨'
};

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

  const getEffectiveStat = (mon: Pokemon, stat: StatKey) => {
    let baseValue = mon.stats[stat];
    if (mon.heldItem && mon.heldItem.statModifiers[stat]) {
      baseValue += mon.heldItem.statModifiers[stat]!;
    }
    return baseValue;
  };

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

        if (floor % 5 === 0) {
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

        const targetStat = upgrade.stat as StatKey; 
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
                  <div className='space-y-2 text-sm font-bold border-b-4 border-black pb-4 mb-4'>
                    <div className='flex justify-between'>
                      <span className='text-red-700'>❤️ Health</span>
                      <span>{player.stats.hp}/{player.stats.maxHp}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-orange-700'>👊 Attack</span>
                      <span>{getEffectiveStat(player, 'attack')}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-blue-700'>🛡️ Defense</span>
                      <span>{getEffectiveStat(player, 'defense')}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-yellow-600'>⚡ Speed</span>
                      <span>{getEffectiveStat(player, 'speed')}</span>
                    </div>
                    <div className='flex justify-between text-gray-600 pt-2 border-t border-gray-400'>
                      <span>🎯 Crit: {getEffectiveStat(player, 'critChance')}%</span>
                      <span>💨 Dodge: {getEffectiveStat(player, 'dodge')}%</span>
                    </div>
                  </div>

                  {/* SAO Style Equipment Menu */}
                  <div className='mt-6 bg-white border-2 border-gray-300 rounded shadow-md flex flex-col relative overflow-hidden font-sans'>
                    <div className='p-2 flex justify-center border-b border-gray-100'>
                       <h3 className='text-gray-400 text-[10px] font-bold uppercase'>
                        <h2 className='text-sm uppercase flex justify-between items-center'>
                          <span>{player.name}</span>
                          <span className="flex gap-2 text-sm drop-shadow-sm">
                            {player.types.map(t => (
                              <span key={t} title={t.toUpperCase()}>{TYPE_SYMBOLS[t] || '⚪'}</span>
                            ))}
                          </span>
                        </h2>
                       </h3>
                    </div>
                    
                    {/* Central Display Area */}
                    <div className='relative h-48 flex items-center justify-center bg-gradient-to-b from-white to-[#f4f4f4]'>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${player.id}.png`}
                        alt="Avatar Silhouette"
                        className="w-32 h-32 object-contain opacity-40 brightness-0 pointer-events-none" 
                      />
                      
                      <div className='absolute top-4 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
                      <div className='absolute top-10 right-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
                      <div className='absolute bottom-10 right-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
                      
                      {/* Active/Selected Node (Orange) */}
                      <div className='absolute bottom-4 w-10 h-10 rounded-full border-[3px] border-gray-200 bg-white shadow-md cursor-pointer flex items-center justify-center overflow-hidden'>
                         {player.heldItem ? (
                           <img src={player.heldItem.spriteUrl} alt="held item" className="w-8 h-8 object-contain drop-shadow-sm" />
                         ) : (
                           <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                         )}
                      </div>
                      
                      <div className='absolute bottom-10 left-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
                      <div className='absolute top-10 left-14 w-7 h-7 rounded-full border-[3px] border-gray-200 bg-gray-500 hover:bg-gray-400 shadow-sm cursor-pointer'></div>
                    </div>

                    {/* SAO Style Detail Pane */}
                    <div className='bg-[#e9ecef] p-3 border-t border-gray-200'>
                      <div className='flex items-center gap-2 mb-1'>
                        <div className='bg-gray-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold'>✖</div>
                        <span className='font-bold text-gray-700 text-sm'>Held Item</span>
                      </div>
                      <div className='pl-6 text-xs text-gray-500 space-y-1 min-h-[50px]'>
                        {player.heldItem ? (
                          <>
                            <p className="font-bold text-black uppercase">{player.heldItem.name}</p>
                            <p className="leading-tight">{player.heldItem.description}</p>
                            <p className="mt-1 font-bold">
                              Bonuses: <span className="text-orange-500">
                                {Object.entries(player.heldItem.statModifiers).map(([stat, val]) => `${stat.toUpperCase()} ${val! > 0 ? '+' : ''}${val}`).join(', ')}
                              </span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p>No item currently equipped.</p>
                            <p>Stat Bonus: <span className="text-orange-400">0.00</span></p>
                          </>
                        )}
                      </div>
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
                  <h2 className="text-3xl font-black text-yellow-400 mb-8 drop-shadow-md">CHOOSE REWARD</h2>
                  <div className="flex gap-4">
                    {upgrades.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUpgrade(u)}
                        className={`bg-gray-800 border-4 ${u.stat === 'equipment' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-yellow-500'} p-4 rounded-xl hover:bg-gray-700 transition-all text-white w-52 flex flex-col items-center cursor-pointer`}
                      >
                        {/* Dynamically render the equipment sprite if the payload exists */}
                        {u.equipment && (
                          <div className="bg-white/10 p-2 rounded-full mb-3">
                            <img src={u.equipment.spriteUrl} alt={u.name} className="w-12 h-12 object-contain pixelated drop-shadow-xl" />
                          </div>
                        )}
                        <span className="text-xl font-bold text-center uppercase">{u.name}</span>
                        {u.stat === 'equipment' && <span className="text-[10px] text-purple-400 tracking-widest font-black uppercase mt-1">Held Item</span>}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;