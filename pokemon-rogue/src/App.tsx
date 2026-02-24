import { PokemonCard } from './components/PokemonCard';
import {useState, useEffect } from 'react';
import { type Pokemon } from './types/pokemon';
import { getRandomPokemon } from './utilsfb/api';

function App() {
  const [player, setPlayer] = useState<Pokemon | null>(null);
  const [enemy, setEnemy] = useState<Pokemon | null>(null);

  useEffect(() => {
    const initGame = async() => {
      const p1 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);
      const p2 = await getRandomPokemon(Math.floor(Math.random() * 151) + 1);

      setPlayer({...p1, isPlayer: true});
      setEnemy({...p2, isPlayer: false});
    };
    initGame();
  }, []);

  if (!player || !enemy) {
    return <div>Loading...</div>
  }

  return (
    <div className='min-h-screen w-screen bg-black text-white flex justify-center items-center'>
      <div className='flex gap-10'>
        <PokemonCard pokemon={enemy} />
        <PokemonCard pokemon={player} />
      </div>
    </div>
  )
}

export default App