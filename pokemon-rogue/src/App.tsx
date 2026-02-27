import { PokemonCard } from './components/PokemonCard';
import { StartScreen } from './components/StartScreen'; 
import { LootOverlay } from './components/LootOverlay'; 
import { PlayerDashboard } from './components/PlayerDashboard'; 
import { useGameEngine } from './hooks/useGameEngine';
import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const {
    player, enemy, playerTurn, gameLog, floor, upgrades,
    playerAnimation, enemyAnimation, isGameStarted, highScore,
    startGame, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    gameOver, winner
  } = useGameEngine();
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog]);
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
                <div ref={logEndRef} />
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
                  {/* --- ENEMY SIDE --- */}
                  {/* Enemy Info Card (Top Left) */}
                  <div className="absolute top-40 left-10 z-30">
                    <PokemonCard pokemon={enemy} />
                  </div>
                  
                  {/* Enemy Sprite (Top Right) */}
                  <div className={`absolute top-30 right-10 flex flex-col items-center justify-end z-10 ${enemyAnimation}`}>
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
                      alt={enemy.name}
                      className="w-48 h-48 pixelated drop-shadow-2xl relative z-10"
                    />
                    {/* Ground Shadow */}
                    <div className="w-32 h-6 bg-black/20 rounded-[100%] absolute bottom-4 blur-sm z-0"></div>
                  </div>

                  {/* --- PLAYER SIDE --- */}
                  {/* Player Info Card (Bottom Right) */}
                  <div className="absolute bottom-30 right-10 z-30">
                    <PokemonCard pokemon={player} />
                  </div>

                  {/* Player Sprite (Bottom Left) */}
                  <div className={`absolute bottom-10 left-20 flex flex-col items-center justify-end z-20 ${playerAnimation}`}>
                    <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
                      alt={player.name}
                      className="w-56 h-56 pixelated drop-shadow-2xl relative z-10"
                    />
                    {/* Ground Shadow */}
                    <div className="w-40 h-8 bg-black/20 rounded-[100%] absolute bottom-2 blur-sm z-0"></div>
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