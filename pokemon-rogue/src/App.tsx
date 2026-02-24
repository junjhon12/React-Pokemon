import { useState } from 'react'
import './App.css'
import {Pokemon} from './types/pokemon';
import { PokemonCard } from './components/PokemonCard';
import { playerMon, enemyMon } from './utils/mockData';

function App() {
  return (
    <div className='min-h-screen w-screen bg-black text-white flex justify-center items-center'>
      <div className='flex gap-10'>
        <PokemonCard pokemon={enemyMon} />
        <PokemonCard pokemon={playerMon} />
      </div>
    </div>
  )
}

export default App