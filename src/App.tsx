import { PokemonCard } from './components/PokemonCard';
import { StartScreen } from './components/StartScreen'; 
import { LootOverlay } from './components/LootOverlay'; 
import { PlayerDashboard } from './components/PlayerDashboard'; 
import { StarterSelection } from './playerPokemonSelection';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameStore } from './store/gameStore'; 
import { useEffect, useRef } from 'react';
import './App.css';

function App() {
  const {
    player, enemy, gameLog, floor, upgrades,
    playerAnimation, enemyAnimation, isGameStarted, highScore
  } = useGameStore();

  const {
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    gameOver, winner
  } = useGameEngine();
  
  const logEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameLog]);

  // ==========================================
  // LOCAL: Save Score Function
  // ==========================================
  const handleFinishRun = () => {
    if (!player) return;

    // 1. Get existing scores from local browser storage
    const currentHighScores = JSON.parse(localStorage.getItem('rogue-high-scores') || '[]');
    
    // 2. Create the new score entry
    const newScore = {
      pokemon: player.name.charAt(0).toUpperCase() + player.name.slice(1),
      floor: floor,
      date: new Date().toLocaleDateString()
    };
    
    // 3. Add to the list and sort highest to lowest
    currentHighScores.push(newScore);
    currentHighScores.sort((a: any, b: any) => b.floor - a.floor); 
    
    // 4. Save the top 10 back to the browser
    localStorage.setItem('rogue-high-scores', JSON.stringify(currentHighScores.slice(0, 10))); 

    setIsGameStarted('START');
  };

  return (
    <div className='min-h-screen w-screen bg-black flex items-center justify-center font-mono p-4'>
      
      {isGameStarted === 'START' && (
        <StartScreen highScore={highScore} startGame={startGame} />
      )}

      {isGameStarted === 'SELECT' && (
        <StarterSelection onSelectStarter={selectStarterAndStart} />
      )}

      {isGameStarted === 'BATTLE' && (
        <div className='w-full max-w-6xl h-200 flex bg-white border-4 border-mist-600 rounded-lg overflow-hidden shadow-2xl'>
          
          {player && (
            <PlayerDashboard 
              handleMoveClick={handleMoveClick} 
            />
          )}

          <div className='flex-1 flex flex-col relative bg-[#1a1a24]'>
            
            <div className='h-12 bg-[#b31429] flex items-center px-6 justify-between border-b-4 border-black shrink-0'>
              <h1 className='text-white font-black text-xl tracking-widest uppercase'>
                {floor % 10 === 0 ? `BOSS ROOM ${floor}` : floor % 5 === 0 ? `MINI-BOSS ${floor}` : `ROOM ${floor}`}
              </h1>
              <span className="text-gray-200 font-bold text-sm">AREA {Math.ceil(floor/5)}</span>
            </div>

            <div className='w-full h-32 bg-black text-green-400 p-4 overflow-y-auto text-sm font-mono border-b-4 border-black shrink-0 shadow-inner'>
              {gameLog.map((log, i) => (
                <p key={i} className="mb-1">{log}</p>
              ))}
              <div ref={logEndRef} />
            </div>

            <div className='flex-1 relative bg-linear-to-b from-[#87ceeb] to-[#90ee90] overflow-hidden'>
              
              <LootOverlay upgrades={upgrades} handleSelectUpgrade={handleSelectUpgrade} />

              {gameOver && upgrades.length === 0 && (
                <div className='absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center'>
                  <h2 className='text-6xl font-black mb-6 text-yellow-400'>
                    {winner === 'Player' ? 'VICTORY!' : 'GAME OVER'}
                  </h2>
                  {winner === 'Enemy' && (
                    <button 
                      onClick={handleFinishRun} // <-- NEW: Triggers the DB save
                      className='bg-red-600 hover:bg-red-700 border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-xl cursor-pointer'
                    >
                      Finish Run
                    </button>
                  )}
                </div>
              )}

              {player && enemy && (
                <>
                  <div className="absolute top-12 left-0 w-full px-10 flex justify-between items-start z-10">
                    <PokemonCard pokemon={enemy} />
                    
                    <div className={`relative flex flex-col items-center justify-end mr-10 mt-4 ${enemyAnimation}`}>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
                        alt={enemy.name}
                        className="w-48 h-48 pixelated drop-shadow-2xl relative z-10"
                      />
                      <div className="w-32 h-6 bg-black/20 rounded-[100%] absolute bottom-10 blur-sm z-0"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-12 left-0 w-full px-10 flex justify-between items-end z-20">
                    <div className={`relative flex flex-col items-center justify-end ml-10 ${playerAnimation}`}>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
                        alt={player.name}
                        className="w-56 h-56 pixelated drop-shadow-2xl relative z-10"
                      />
                      <div className="w-40 h-8 bg-black/20 rounded-[100%] absolute bottom-10 blur-sm z-0"></div>
                    </div>

                    <div className="mb-10">
                      <PokemonCard pokemon={player} />
                    </div>
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