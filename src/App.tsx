import { StartScreen } from './components/StartScreen'; 
import { LootOverlay } from './components/LootOverlay'; 
import { PlayerDashboard } from './components/PlayerDashboard'; 
import { BattleArena } from './components/BattleArena';
import { CombatLog } from './components/CombatLog';
import { StarterSelection } from './playerPokemonSelection';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameStore } from './store/gameStore'; 
import { MoveReplacementOverlay } from './components/MoveReplacementOverlay';
import './App.css';

function App() {
  // ATOMIC SELECTORS: Component only reacts to changes in these specific fields
  const player = useGameStore((state) => state.player);
  const enemy = useGameStore((state) => state.enemy);
  const gameLog = useGameStore((state) => state.gameLog);
  const floor = useGameStore((state) => state.floor);
  const upgrades = useGameStore((state) => state.upgrades);
  const playerAnimation = useGameStore((state) => state.playerAnimation);
  const enemyAnimation = useGameStore((state) => state.enemyAnimation);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const highScore = useGameStore((state) => state.highScore);
  const pendingMove = useGameStore((state) => state.pendingMove);
  const dungeonModifier = useGameStore((state) => state.dungeonModifier);
  const resetRun = useGameStore((state) => state.resetRun);

  const {
    startGame, selectStarterAndStart, handleMoveClick, handleSelectUpgrade,
    handleReplaceMove, handleSkipMove, gameOver, winner
  } = useGameEngine();

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
    resetRun(); 
  };

  return (
    <div className='min-h-screen w-full bg-black flex items-start md:items-center justify-center font-mono p-0 sm:p-2 md:p-4'>
      
      {isGameStarted === 'START' && (
        <StartScreen highScore={highScore} startGame={startGame} />
      )}

      {isGameStarted === 'SELECT' && (
        <StarterSelection onSelectStarter={selectStarterAndStart} />
      )}

      {isGameStarted === 'BATTLE' && (
        <div className='w-full max-w-6xl h-auto min-h-screen md:min-h-0 md:h-200 flex flex-col md:flex-row bg-white md:border-4 border-mist-600 md:rounded-lg overflow-hidden md:shadow-2xl'>
          
          {player && <PlayerDashboard handleMoveClick={handleMoveClick} />}

          <div className='contents md:flex md:flex-1 md:flex-col relative bg-[#1a1a24]'>
            <div className='order-1 md:order-1 h-10 md:h-12 bg-[#b31429] flex items-center px-4 md:px-6 justify-between border-b-4 border-black shrink-0'>
              <h1 className='text-white font-black text-lg md:text-xl tracking-widest uppercase'>
                {floor % 10 === 0 ? `BOSS ${floor}` : floor % 5 === 0 ? `MINI-BOSS ${floor}` : `ROOM ${floor}`}
              </h1>
              <span className="text-gray-200 font-bold text-xs md:text-sm">AREA {Math.ceil(floor/5)}</span>
            </div>

            <CombatLog gameLog={gameLog} />

            <div className='order-2 md:order-3 w-full h-[50vh] md:h-auto md:flex-1 relative bg-[#1a1a24] overflow-hidden'>
              <LootOverlay upgrades={upgrades} handleSelectUpgrade={handleSelectUpgrade} />
              
              {pendingMove && (
                <MoveReplacementOverlay 
                  handleReplaceMove={handleReplaceMove} 
                  handleSkipMove={handleSkipMove} 
                />
              )}

              {gameOver && winner === 'Enemy' && (
                <div className='absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 text-center'>
                  <h2 className='text-4xl md:text-6xl font-black mb-6 text-yellow-400'>GAME OVER</h2>
                  <button onClick={handleFinishRun} className='bg-red-600 hover:bg-red-700 border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-xl cursor-pointer'>
                    Finish Run
                  </button>
                </div>
              )}

              {player && enemy && (
                <BattleArena 
                  player={player} 
                  enemy={enemy} 
                  playerAnimation={playerAnimation}
                  enemyAnimation={enemyAnimation}
                  dungeonModifier={dungeonModifier}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;