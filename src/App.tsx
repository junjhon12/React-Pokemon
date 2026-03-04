import { PokemonCard } from './components/PokemonCard';
import { StartScreen } from './components/StartScreen'; 
import { LootOverlay } from './components/LootOverlay'; 
import { PlayerDashboard } from './components/PlayerDashboard'; 
import { StarterSelection } from './playerPokemonSelection';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameStore } from './store/gameStore'; 
import { useEffect, useRef } from 'react';
import { MoveReplacementOverlay } from './components/MoveReplacementOverlay';
import './App.css';

function App() {
  const {
  player, enemy, gameLog, floor, upgrades,
  playerAnimation, enemyAnimation, isGameStarted, highScore,
  pendingMove, playerTurn,
  dungeonModifier
} = useGameStore();

// Define a helper to get background styles based on the modifier
const getArenaBackground = () => {
  switch (dungeonModifier) {
    case 'volcanic':
      return 'bg-gradient-to-b from-orange-900/40 via-red-900/20 to-transparent';
    case 'thick-fog':
      return 'bg-gradient-to-b from-gray-500/40 via-slate-700/20 to-transparent backdrop-blur-[2px]';
    case 'electric-terrain':
      return 'bg-gradient-to-b from-yellow-600/30 via-blue-900/20 to-transparent';
    case 'hail':
      return 'bg-gradient-to-b from-cyan-100/20 via-blue-400/10 to-transparent';
    default:
      return 'bg-gradient-to-b from-blue-900/20 to-transparent';
  }
};

  const {
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade, setIsGameStarted,
    handleReplaceMove, handleSkipMove,
    gameOver, winner
  } = useGameEngine();
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [gameLog]);

  const handleFinishRun = () => {
    if (!player) return;
    const currentHighScores = JSON.parse(localStorage.getItem('rogue-high-scores') || '[]');
    const newScore = {
      pokemon: player.name.charAt(0).toUpperCase() + player.name.slice(1),
      floor: floor,
      date: new Date().toLocaleDateString()
    };
    currentHighScores.push(newScore);
    currentHighScores.sort((a: any, b: any) => b.floor - a.floor); 
    localStorage.setItem('rogue-high-scores', JSON.stringify(currentHighScores.slice(0, 10))); 
    setIsGameStarted('START');
  };

  return (
    // 1. CHANGE: Changed `items-center` to `items-start md:items-center` so the page can scroll natively on mobile
    <div className='min-h-screen w-full bg-black flex items-start md:items-center justify-center font-mono p-0 sm:p-2 md:p-4'>
      
      {isGameStarted === 'START' && (
        <StartScreen highScore={highScore} startGame={startGame} />
      )}

      {isGameStarted === 'SELECT' && (
        <StarterSelection onSelectStarter={selectStarterAndStart} />
      )}

      {isGameStarted === 'BATTLE' && (
        <div className='w-full max-w-6xl h-auto min-h-screen md:min-h-0 md:h-200 flex flex-col md:flex-row bg-white md:border-4 border-mist-600 md:rounded-lg overflow-hidden md:shadow-2xl'>
          
          {player && (
            <PlayerDashboard handleMoveClick={handleMoveClick} />
          )}

          <div className='contents md:flex md:flex-1 md:flex-col relative bg-[#1a1a24]'>
            
            <div className='order-1 md:order-1 h-10 md:h-12 bg-[#b31429] flex items-center px-4 md:px-6 justify-between border-b-4 border-black shrink-0'>
              <h1 className='text-white font-black text-lg md:text-xl tracking-widest uppercase'>
                {floor % 10 === 0 ? `BOSS ${floor}` : floor % 5 === 0 ? `MINI-BOSS ${floor}` : `ROOM ${floor}`}
              </h1>
              <span className="text-gray-200 font-bold text-xs md:text-sm">AREA {Math.ceil(floor/5)}</span>
            </div>

            <div 
              ref={logContainerRef} 
              className='order-4 md:order-2 w-full h-32 md:h-32 bg-black text-green-400 p-3 md:p-4 overflow-y-auto text-xs md:text-sm font-mono border-y-4 md:border-t-0 md:border-b-4 border-black shrink-0 shadow-inner'
            >
              {gameLog.map((log, i) => (
                <p key={i} className="mb-1">{log}</p>
              ))}
            </div>

            <div className='order-2 md:order-3 w-full min-h-[40vh] md:min-h-0 md:flex-1 relative bg-linear-to-b from-[#87ceeb] to-[#90ee90] overflow-hidden'>
              
              <LootOverlay upgrades={upgrades} handleSelectUpgrade={handleSelectUpgrade} />
              {pendingMove && (
                <MoveReplacementOverlay 
                  handleReplaceMove={handleReplaceMove} 
                  handleSkipMove={handleSkipMove} 
                />
              )}
              {gameOver && winner === 'Enemy' && (
                <div className='absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 text-center'>
                  <h2 className='text-4xl md:text-6xl font-black mb-6 text-yellow-400'>
                    GAME OVER
                  </h2>
                  <button 
                    onClick={handleFinishRun}
                    className='bg-red-600 hover:bg-red-700 border-2 border-white text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-lg md:text-xl cursor-pointer'
                  >
                    Finish Run
                  </button>
                </div>
              )}

              {player && enemy && (
                <>
                  <div className="absolute top-4 md:top-12 left-0 w-full px-4 md:px-10 flex justify-between items-start z-10">
                    <div className="scale-75 origin-top-left md:scale-100">
                      <PokemonCard pokemon={enemy} />
                    </div>
                    
                    <div className={`relative flex flex-col items-center justify-end md:mr-10 mt-2 md:mt-4 ${enemyAnimation}`}>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemy.id}.png`}
                        alt={enemy.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-48 md:h-48 pixelated drop-shadow-2xl relative z-10"
                      />
                      <div className="w-16 sm:w-20 md:w-32 h-3 sm:h-4 md:h-6 bg-black/20 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-sm z-0"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-2 md:bottom-12 left-0 w-full px-4 md:px-10 flex justify-between items-end z-20">
                    <div className={`relative flex flex-col items-center justify-end md:ml-10 ${playerAnimation}`}>
                      <img 
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${player.id}.png`}
                        alt={player.name}
                        className="w-28 h-28 sm:w-32 sm:h-32 md:w-56 md:h-56 pixelated drop-shadow-2xl relative z-10"
                      />
                      <div className="w-20 sm:w-24 md:w-40 h-4 sm:h-6 md:h-8 bg-black/20 rounded-[100%] absolute bottom-2 sm:bottom-4 md:bottom-10 blur-sm z-0"></div>
                    </div>

                    <div className="mb-2 md:mb-10 scale-75 origin-bottom-right md:scale-100">
                      <PokemonCard pokemon={player} isPlayer={true} />
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