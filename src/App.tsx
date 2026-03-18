// src/App.tsx
import { useState, useEffect } from 'react';
import { StartScreen } from './components/StartScreen';
import { LootOverlay } from './components/LootOverlay';
import { PlayerDashboard } from './components/PlayerDashboard';
import { BattleArena } from './components/BattleArena';
import { CombatLog } from './components/CombatLog';
import { MoveDraftOverlay } from './components/MoveDraftOverlay';
import { StarterSelection } from './playerPokemonSelection';
import { useGameEngine } from './hooks/useGameEngine';
import { useGameStore } from './store/gameStore';
import { MoveReplacementOverlay } from './components/MoveReplacementOverlay';
import './App.css';

const TUTORIAL_KEY = 'rogue-tutorial-seen';

const TUTORIAL_TIPS = [
  { icon: '⚔️', text: 'Pick a move each turn. Moves glow green when super effective. ⚔ = physical, ✦ = special.' },
  { icon: '💚', text: 'You fully heal and cure all status after every battle automatically.' },
  { icon: '📜', text: 'After every battle you choose 1 of 3 moves to learn — or skip. Build your moveset deliberately.' },
  { icon: '🎒', text: 'You can hold up to 6 items at once — all active simultaneously. Stack freely.' },
  { icon: '⭐', text: 'Every 5 floors is a Mini-Boss. Every 10 floors is a Legendary Boss that also restores your PP.' },
];

function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className='fixed inset-0 bg-black/80 z-200 flex items-center justify-center p-4'>
      <div className='bg-[#1a1a24] border-2 border-yellow-400 rounded-xl max-w-md w-full p-6 font-mono shadow-2xl'>
        <h2 className='text-yellow-400 font-black text-xl tracking-widest uppercase mb-1 text-center'>
          How to Play
        </h2>
        <p className='text-gray-400 text-xs text-center mb-5 uppercase tracking-widest'>
          Quick tips before your run
        </p>
        <ul className='space-y-3 mb-6'>
          {TUTORIAL_TIPS.map((tip, i) => (
            <li key={i} className='flex gap-3 items-start text-sm text-gray-200 leading-snug'>
              <span className='text-lg shrink-0 mt-0.5'>{tip.icon}</span>
              <span>{tip.text}</span>
            </li>
          ))}
        </ul>
        <div className='flex flex-col gap-2'>
          <button
            onClick={() => { localStorage.setItem(TUTORIAL_KEY, '1'); onClose(); }}
            className='w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-lg text-sm tracking-widest uppercase cursor-pointer transition-colors'
          >
            Got it — start battling!
          </button>
          <button
            onClick={onClose}
            className='w-full text-gray-500 hover:text-gray-300 text-xs py-1 cursor-pointer transition-colors'
          >
            Show again next time
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading]       = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const player            = useGameStore((state) => state.player);
  const enemy             = useGameStore((state) => state.enemy);
  const gameLog           = useGameStore((state) => state.gameLog);
  const floor             = useGameStore((state) => state.floor);
  const upgrades          = useGameStore((state) => state.upgrades);
  const playerAnimation   = useGameStore((state) => state.playerAnimation);
  const enemyAnimation    = useGameStore((state) => state.enemyAnimation);
  const isGameStarted     = useGameStore((state) => state.isGameStarted);
  const highScore         = useGameStore((state) => state.highScore);
  const pendingMove       = useGameStore((state) => state.pendingMove);
  const pendingMoveChoices = useGameStore((state) => state.pendingMoveChoices);
  const dungeonModifier   = useGameStore((state) => state.dungeonModifier);
  const resetRun          = useGameStore((state) => state.resetRun);

  const {
    startGame, selectStarterAndStart, handleMoveClick, handlePickMove,
    handleSelectUpgrade, handleReplaceMove, handleSkipMove, gameOver, winner,
  } = useGameEngine();

  useEffect(() => {
    if (isGameStarted === 'BATTLE' && !localStorage.getItem(TUTORIAL_KEY)) {
      setTimeout(() => setShowTutorial(true), 0);
    }
  }, [isGameStarted]);

  const handleSelectStarterWithLoading = async (starterId: number) => {
    setIsLoading(true);
    await selectStarterAndStart(starterId);
    setIsLoading(false);
  };

  const handleSelectUpgradeWithLoading = async (upgrade: Parameters<typeof handleSelectUpgrade>[0]) => {
    setIsLoading(true);
    await handleSelectUpgrade(upgrade);
    setIsLoading(false);
  };

  const handleFinishRun = () => {
    if (!player) return;
    interface HighScoreEntry { pokemon: string; floor: number; date: string; }
    const currentHighScores: HighScoreEntry[] = JSON.parse(localStorage.getItem('rogue-high-scores') || '[]');
    currentHighScores.push({
      pokemon: player.name.charAt(0).toUpperCase() + player.name.slice(1),
      floor,
      date: new Date().toLocaleDateString(),
    });
    currentHighScores.sort((a, b) => b.floor - a.floor);
    localStorage.setItem('rogue-high-scores', JSON.stringify(currentHighScores.slice(0, 10)));
    resetRun();
  };

  const handleResetRun = () => {
    if (!window.confirm('Abandon this run and start over?')) return;
    resetRun();
  };

  const areaNumber  = Math.ceil(floor / 5);
  const isBossFloor = floor % 10 === 0;
  const floorLabel  = isBossFloor
    ? `BOSS FLOOR ${floor}`
    : floor % 5 === 0
      ? `MINI-BOSS FLOOR ${floor}`
      : `FLOOR ${floor}`;

  return (
    <div className='min-h-screen w-full bg-black flex items-start md:items-center justify-center font-mono p-0 sm:p-2 md:p-4'>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {isLoading && (
        <div className='fixed inset-0 bg-black/80 z-100 flex flex-col items-center justify-center gap-4'>
          <div className='w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin' />
          <p className='text-yellow-400 font-black text-lg tracking-widest uppercase animate-pulse'>
            Loading...
          </p>
        </div>
      )}

      {isGameStarted === 'START' && (
        <StartScreen highScore={highScore} startGame={startGame} />
      )}

      {isGameStarted === 'SELECT' && (
        <StarterSelection onSelectStarter={handleSelectStarterWithLoading} />
      )}

      {isGameStarted === 'BATTLE' && (
        <div className='w-full max-w-6xl h-auto min-h-screen md:min-h-0 md:h-200 flex flex-col md:flex-row bg-white md:border-4 border-mist-600 md:rounded-lg overflow-hidden md:shadow-2xl'>

          {player && <PlayerDashboard handleMoveClick={handleMoveClick} />}

          <div className='contents md:flex md:flex-1 md:flex-col relative bg-[#1a1a24]'>
            <div className='order-1 md:order-1 h-10 md:h-12 bg-[#b31429] flex items-center px-4 md:px-6 justify-between border-b-4 border-black shrink-0'>
              <h1 className='text-white font-black text-lg md:text-xl tracking-widest uppercase'>
                {floorLabel}
              </h1>
              <div className='flex items-center gap-2 md:gap-3'>
                <span className='text-gray-200 font-bold text-xs md:text-sm'>AREA {areaNumber}</span>
                <button
                  onClick={() => setShowTutorial(true)}
                  title='How to play'
                  className='text-white/60 hover:text-white text-xs border border-white/30 hover:border-white/60 px-2 py-0.5 rounded transition-colors cursor-pointer'
                >
                  ?
                </button>
                <button
                  onClick={handleResetRun}
                  title='Abandon run'
                  className='text-white/60 hover:text-red-400 text-xs border border-white/30 hover:border-red-400 px-2 py-0.5 rounded transition-colors cursor-pointer'
                >
                  ↩ Reset
                </button>
              </div>
            </div>

            <CombatLog gameLog={gameLog} />

            <div className='order-2 md:order-3 w-full h-[50vh] md:h-auto md:flex-1 relative bg-[#1a1a24] overflow-hidden'>

              {/* Move draft — shown first after battle, before loot */}
              {pendingMoveChoices.length > 0 && (
                <MoveDraftOverlay handlePickMove={handlePickMove} />
              )}

              <LootOverlay
                upgrades={upgrades}
                handleSelectUpgrade={handleSelectUpgradeWithLoading}
              />

              {pendingMove && (
                <MoveReplacementOverlay
                  handleReplaceMove={handleReplaceMove}
                  handleSkipMove={handleSkipMove}
                />
              )}

              {gameOver && winner === 'Enemy' && (
                <div className='absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 text-center'>
                  <h2 className='text-4xl md:text-6xl font-black mb-4 text-yellow-400'>GAME OVER</h2>

                  {player && (
                    <div className='mb-6 space-y-1 text-sm md:text-base'>
                      <p className='text-gray-300'>
                        You reached <span className='text-white font-bold'>{floorLabel}</span> in{' '}
                        <span className='text-white font-bold'>Area {areaNumber}</span>
                      </p>
                      <p className='text-gray-300'>
                        Pokémon: <span className='text-white font-bold'>{player.name}</span>
                        {' '}·{' '}
                        Level <span className='text-white font-bold'>{player.level}</span>
                      </p>
                      <p className='text-gray-300'>
                        HP remaining:{' '}
                        <span className='text-red-400 font-bold'>
                          {Math.ceil(player.stats.hp)} / {player.stats.maxHp}
                        </span>
                      </p>
                      {(player.equipment?.length ?? 0) > 0 && (
                        <p className='text-gray-300'>
                          Items held:{' '}
                          <span className='text-purple-400 font-bold'>
                            {player.equipment!.map(e => e.name).join(', ')}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleFinishRun}
                    className='bg-red-600 hover:bg-red-700 border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-xl cursor-pointer'
                  >
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