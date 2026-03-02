import { useEffect } from 'react';
import { type Pokemon, type StatKey } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';
import { getRandomPokemon, fetchEquipmentFromPokeAPI } from '../utils/api'; 
import { scaleEnemyStats, getRandomUpgrades, getTypeEffectiveness, EVOLUTION_MAP, getEffectiveStat } from '../utils/gameLogic';
import { ITEM_POOL } from '../data/items';
import { useGameStore } from '../store/gameStore'; // <-- NEW IMPORT

export const useGameEngine = () => {
  // Pull state from Zustand
  const {
    player, enemy, playerTurn, gameLog, floor, upgrades,
    playerAnimation, enemyAnimation, isGameStarted, highScore
  } = useGameStore();

  // Zustand wrappers to mimic React's setState so we don't break the combat math
  const setPlayer = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ player: val(s.player) }) : { player: val });
  const setEnemy = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemy: val(s.enemy) }) : { enemy: val });
  const setPlayerTurn = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerTurn: val(s.playerTurn) }) : { playerTurn: val });
  const setGameLog = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ gameLog: val(s.gameLog) }) : { gameLog: val });
  const setFloor = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ floor: val(s.floor) }) : { floor: val });
  const setUpgrades = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ upgrades: val(s.upgrades) }) : { upgrades: val });
  const setPlayerAnimation = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ playerAnimation: val(s.playerAnimation) }) : { playerAnimation: val });
  const setEnemyAnimation = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ enemyAnimation: val(s.enemyAnimation) }) : { enemyAnimation: val });
  const setIsGameStarted = (val: any) => useGameStore.setState(typeof val === 'function' ? (s) => ({ isGameStarted: val(s.isGameStarted) }) : { isGameStarted: val });
  
  const setHighScore = (val: any) => {
     const newScore = typeof val === 'function' ? val(highScore) : val;
     localStorage.setItem('rogue-score', newScore.toString());
     useGameStore.setState({ highScore: newScore });
  };

  useEffect(() => {
    if (player && player.stats.hp === 0) {
      if (floor > highScore) {
        setHighScore(floor);
      }
    }
  }, [player?.stats.hp]);

  const startGame = () => setIsGameStarted('SELECT');

  const selectStarterAndStart = async (starterId: number) => {
    setFloor(1);
    setGameLog(['Welcome to the Dungeon!', 'Battle Start!']);
    setUpgrades([]);

    const [p1, p2] = await Promise.all([
      getRandomPokemon(starterId),
      getRandomPokemon(Math.floor(Math.random() * 151) + 1)
    ]);

    const playerMon = { ...p1, isPlayer: true };
    const enemyMon = { ...p2, isPlayer: false };

    setPlayer(playerMon);
    setEnemy(enemyMon);

    if (p1.stats.speed >= p2.stats.speed) {
      setPlayerTurn(true);
      setGameLog((prev: string[]) => [...prev, `${p1.name} moves first!`]);
    } else {
      setPlayerTurn(false);
      setGameLog((prev: string[]) => [...prev, `${p2.name} is faster!`]);
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
          setGameLog((prev: string[]) => [...prev, `Level Up! You are now Lvl ${newPlayer.level}!`]);
        } else {
          newPlayer.xp = totalXp;
          setGameLog((prev: string[]) => [...prev, `You gained ${xpGain} XP.`]);
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
          setGameLog((prev: string[]) => [...prev, `${enemy.name} thawed out!`]);
          setEnemy((e: Pokemon | null) => e ? { ...e, status: 'normal' } : null);
        } else {
          setGameLog((prev: string[]) => [...prev, `${enemy.name} is frozen solid!`]);
          setPlayerTurn(true);
          return;
        }
      } else if (enemy.status === 'paralyze' && Math.random() < 0.25) {
        setGameLog((prev: string[]) => [...prev, `${enemy.name} is paralyzed! It can't move!`]);
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
          setGameLog((prev: string[]) => [...prev, `${player.name} dodged the attack!`]);
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

        setPlayer((prev: Pokemon | null) => {
          if (!prev) return null;
          return { ...prev, stats: { ...prev.stats, hp: Math.max(prev.stats.hp - finalDamage, 0) }, status: appliedStatus };
        });

        let logMsg = `${enemy.name} used ${randomMove.name} for ${finalDamage} damage!`;
        if (isCrit) logMsg += " A Critical Hit!";
        if (effectiveness > 1) logMsg += " It's Super Effective!";
        if (statusLog) logMsg += statusLog;

        if (enemy.status === 'burn' || enemy.status === 'poison') {
          const tickDamage = Math.max(1, Math.floor(enemy.stats.maxHp * 0.1));
          setEnemy((e: Pokemon | null) => e ? { ...e, stats: { ...e.stats, hp: Math.max(e.stats.hp - tickDamage, 0) } } : null);
          logMsg += ` ${enemy.name} took ${tickDamage} damage from its ${enemy.status}!`;
        }

        setGameLog((prev: string[]) => [...prev, logMsg]);

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
      setGameLog((prev: string[]) => [...prev, `A ${newEnemy.name} appears! It's a BOSS!`]);
    } else if (miniBossEnemy) {
      setGameLog((prev: string[]) => [...prev, `It's a ${newEnemy.name} ?! A Mini-Boss!`]);
    } else {
      setGameLog((prev: string[]) => [...prev, `A wild ${newEnemy.name} appears!`]);
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
      setGameLog((prev: string[]) => [...prev, `Equipped ${upgrade.equipment!.name}!`, `Stat bonuses applied dynamically.`]);
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
      setGameLog((prev: string[]) => [...prev, `What? ${player.name} is evolving!`, `Congratulations! You evolved into ${evolvedBase.name}!`]);
    } else {
      setPlayer((prev: Pokemon | null) => {
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
        setGameLog((prev: string[]) => [...prev, `${player.name} thawed out!`]);
        setPlayer((p: Pokemon | null) => p ? { ...p, status: 'normal' } : null);
      } else {
        setGameLog((prev: string[]) => [...prev, `${player.name} is frozen solid!`]);
        setPlayerTurn(false);
        return;
      }
    } else if (player.status === 'paralyze' && Math.random() < 0.25) {
      setGameLog((prev: string[]) => [...prev, `${player.name} is paralyzed! It can't move!`]);
      setPlayerTurn(false);
      return;
    }

    setPlayerAnimation('animate-lunge-right');

    const hitChance = Math.random() * 100;
    if (hitChance > move.accuracy) {
      setTimeout(() => {
        setGameLog((prev: string[]) => [...prev, `${player.name} used ${move.name} but missed!`]);
        setPlayerAnimation(''); 
        setPlayerTurn(false);
      }, 500); 
      return;
    }

    setTimeout(() => {
      const enemyDodge = getEffectiveStat(enemy, 'dodge');
      if ((Math.random() * 100) < enemyDodge) {
        setGameLog((prev: string[]) => [...prev, `${enemy.name} dodged the attack!`]);
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

      setEnemy((prev: Pokemon | null) => {
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
        setPlayer((p: Pokemon | null) => p ? { ...p, stats: { ...p.stats, hp: Math.max(p.stats.hp - tickDamage, 0) } } : null);
        logMsg += ` ${player.name} took ${tickDamage} damage from its ${player.status}!`;
      }

      setGameLog((prev: string[]) => [...prev, logMsg]);

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
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    gameOver, winner
  };
};