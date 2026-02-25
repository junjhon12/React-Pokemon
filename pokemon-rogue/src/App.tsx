import { PokemonCard } from './components/PokemonCard';
import {useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utilsfb/api';

function App() {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [gameLog, setGameLog] = useState<string[]>([]);

  useEffect(() => {
    const initGame = async() => {
      const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
      const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

      setPlayer({...p1, isPlayer: true});
      setEnemy({...p2, isPlayer: false});

      if(p1.speed >= p2.speed) {
        setPlayerTurn(true);
        setGameLog(prev => [...prev, `${p1.name} goes first!`]);
      } else {
        setPlayerTurn(false);
        setGameLog(prev => [...prev, `${p2.name} goes first!`]);
      }
    };
    initGame();
  }, []);

  if (!player || !enemy) {
    return <div>Loading...</div>
  }

  const handleAttack = () => {
    if (!player || !enemy) return;
    const damage = player.attack;
    setEnemy((prev) => {
      if (!prev) return null;
      const newHp = Math.max(prev.hp - damage, 0);
      return {...prev, hp: newHp};
    });
    setGameLog(prev => [...prev, `${player.name} attacks ${enemy.name} for ${damage} damage!`]);
    setPlayerTurn(false);
  }
  return (
    <div className='min-h-screen w-screen bg-black text-white flex justify-center items-center'>
      <div className='flex gap-10'>
        <PokemonCard pokemon={enemy} />
        <PokemonCard pokemon={player} />
      </div>
      <div className='flex flex-col items-center gap-4'>
        {playerTurn ? (
          <button
          onClick = {handleAttack}
          className='bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-full text-xl transition-all'
          >Attack</button>
        ) : (
          <p className='text-gray-400 italic text-xl'>Enemy is thinking...</p>
        )}

        <div className='bg-slate-900 border-2 border-slate-700 p-4 rounded-lg w-96 h-32 overflow-y-auto font-mono text-sm'>
          {gameLog.map((log, i) => (
            <p key={i} className='border-b border-slate-800 pb-1 mb-1'>{log}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App