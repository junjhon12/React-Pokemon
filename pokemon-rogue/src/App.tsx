import { PokemonCard } from './components/PokemonCard';
import { useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utils/api'; // Make sure this path matches your folder name (utils or utilsfb)

function App() {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);
  // I noticed you renamed this to 'playerTurn' instead of 'isPlayerTurn'. 
  // That's fine, just sticking to your variable name here:
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);

  // ----------------------------------------------
  // EFFECT 1: INITIALIZE GAME (Runs Once)
  // ----------------------------------------------
  useEffect(() => {
    const initGame = async () => {
      const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
      const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

      // Important: Assign isPlayer correctly
      const playerMon = { ...p1, isPlayer: true };
      const enemyMon = { ...p2, isPlayer: false };

      setPlayer(playerMon);
      setEnemy(enemyMon);

      // Speed Check for Initiative
      if (p1.speed >= p2.speed) {
        setPlayerTurn(true);
        setGameLog((prev) => [...prev, `Battle Start! ${p1.name} moves first!`]);
      } else {
        setPlayerTurn(false);
        setGameLog((prev) => [...prev, `Battle Start! ${p2.name} is faster!`]);
      }
    };

    initGame();
  }, []); // Empty array = Run once on mount

  // ----------------------------------------------
  // EFFECT 2: ENEMY AI (Runs on Turn Change)
  // ----------------------------------------------
  useEffect(() => {
    // 1. If it's Player's turn OR data is missing, stop.
    if (playerTurn || !enemy || !player) return;

    // 2. Check for Game Over (don't attack a corpse)
    if (enemy.hp <= 0 || player.hp <= 0) return;

    // 3. The "Thinking" Delay
    const turnTimer = setTimeout(() => {
      const damage = enemy.attack;

      // 4. Update Player HP
      setPlayer((prev) => {
        if (!prev) return null;
        return { ...prev, hp: Math.max(prev.hp - damage, 0) };
      });

      // 5. Update Log & Pass Turn
      setGameLog((prev) => [...prev, `${enemy.name} attacked for ${damage} damage!`]);
      setPlayerTurn(true); // Give control back to player
      
    }, 1000);

    return () => clearTimeout(turnTimer);
  }, [playerTurn, enemy, player]); // Run whenever these change

  // ----------------------------------------------
  // LOADING STATE
  // ----------------------------------------------
  if (!player || !enemy) {
    return (
      <div className="min-h-screen w-screen bg-black text-white flex justify-center items-center">
        <h1 className="text-2xl animate-pulse">Loading Battle...</h1>
      </div>
    );
  }

  // ----------------------------------------------
  // PLAYER ATTACK HANDLER
  // ----------------------------------------------
  const handleAttack = () => {
    if (!player || !enemy) return;
    
    const damage = player.attack;
    
    setEnemy((prev) => {
      if (!prev) return null;
      return { ...prev, hp: Math.max(prev.hp - damage, 0) };
    });

    setGameLog((prev) => [...prev, `${player.name} attacks ${enemy.name} for ${damage} damage!`]);
    setPlayerTurn(false); // Pass turn to AI
  };

  const gameOver = player.hp === 0 || enemy.hp === 0;
  const winner = enemy.hp === 0 ? 'Player' : 'Enemy';

  return (
    // Changed flex direction to 'flex-col' so the UI stacks nicely
    <div className='min-h-screen w-screen bg-black text-white flex flex-col justify-center items-center gap-10'>
      
      {/* THE ARENA */}
      <div className='flex gap-10'>
        <PokemonCard pokemon={enemy} />
        <PokemonCard pokemon={player} />
      </div>

      {/* CONTROLS */}
      <div className='flex flex-col items-center gap-4'>
        {gameOver ? (
          <div className='text-center animate-bounce'>
            <h2 className='text-3xl font-bold mb-2 text-yellow-400'>
              {winner === 'Player' ? 'YOU WIN!' : 'YOU DIED'}
            </h2>
            <button 
              onClick={() => window.location.reload()}
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer'
            >
              Play Again
            </button>
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

        {/* LOG */}
        <div className='bg-slate-900 border-2 border-slate-700 p-4 rounded-lg w-96 h-32 overflow-y-auto font-mono text-sm'>
          {gameLog.map((log, i) => (
            <p key={i} className='border-b border-slate-800 pb-1 mb-1'>{log}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;