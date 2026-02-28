import { useState, useEffect } from 'react';
import { type Pokemon, type StatKey } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';
import { getRandomPokemon, fetchEquipmentFromPokeAPI } from '../utils/api'; 
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP, getEffectiveStat } from '../utils/gameLogic';
import { ITEM_POOL } from '../data/items';

export const useGameEngine = () => {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [floor, setFloor] = useState<number>(1);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [playerAnimation, setPlayerAnimation] = useState<string>('');
  const [enemyAnimation, setEnemyAnimation] = useState<string>('');
  
  const [isGameStarted, setIsGameStarted] = useState<'START'|'SELECT'|'BATTLE'>('START');
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

  // Phase 1: Go to Selection Screen
  const startGame = () => {
    setIsGameStarted('SELECT');
  };

  // Phase 2: Pick Starter and Start Battle
  const selectStarterAndStart = async (starterId: number) => {
    setFloor(1);
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    const p1 = await getRandomPokemon(starterId);
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
    
    setIsGameStarted('BATTLE');
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
        const currentEquipCount = player?.equipment?.length || 0;
        
        if (floor % 1 === 0 && currentEquipCount < 6) { 
          const randomItemName = ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)];
          let equipment = await fetchEquipmentFromPokeAPI(randomItemName);
          
          if (!equipment) {
            console.warn("PokeAPI failed to fetch item. Using local fallback.");
            equipment = {
              id: `local-${randomItemName}`,
              name: randomItemName.replace('-', ' ').toUpperCase(),
              description: 'A powerful held item generated locally.',
              spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
              statModifiers: { attack: 10, defense: 10, maxHp: 20 }
            };
          }

          baseLoot.push({
            id: equipment.id,
            name: equipment.name,
            description: equipment.description,
            stat: 'equipment',
            amount: 0,
            equipment: equipment
          });
          
        } else {
          const extra = getRandomUpgrades(1)[0];
          extra.id = Math.random().toString();
          baseLoot.push(extra);
        }
        
        setUpgrades([...baseLoot]);
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
      const currentEquip = player.equipment || [];
      setPlayer({ ...player, equipment: [...currentEquip, upgrade.equipment] });
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
        equipment: player.equipment 
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

  return {
    player, enemy, playerTurn, gameLog, floor, upgrades,
    playerAnimation, enemyAnimation, isGameStarted, highScore,
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    gameOver, winner
  };
};