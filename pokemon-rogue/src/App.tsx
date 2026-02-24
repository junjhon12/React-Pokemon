import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className='h-screen w-screen bg-gray-900 text-white flex justify-center items-center'>
      <h1>Pokemon Rogue Start</h1>
    </div>
  )
}

export default App