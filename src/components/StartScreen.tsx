import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface StartScreenProps {
  highScore: number;
  startGame: () => void;
}

export const StartScreen = ({ highScore, startGame }: StartScreenProps) => {
  const [nameInput, setNameInput] = useState('');
  const { setPlayerName, playerName } = useGameStore();

  useEffect(() => {
    const savedName = localStorage.getItem('rogue-player-name');
    if (savedName && !playerName) {
      setPlayerName(savedName);
    }
  }, [playerName, setPlayerName]);

  const handleSetName = () => {
    const trimmed = nameInput.trim().replace(/\s+/g, '').slice(0, 15);
    if (!trimmed) return;
    setPlayerName(trimmed);
    localStorage.setItem('rogue-player-name', trimmed);
    setNameInput('');
  };

  const handleClearName = () => {
    localStorage.removeItem('rogue-player-name');
    setPlayerName(null);
  };

  return (
    <div className='w-full max-w-lg bg-[#1a1a24] flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden md:border-4 border-black md:rounded-lg shadow-2xl font-mono min-h-[60vh]'>

      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className='z-10 flex flex-col items-center w-full'>
        <h1 className='text-5xl md:text-6xl font-black mb-1 md:mb-2 text-white drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-tighter text-center leading-none'>
          POKÉMON
        </h1>
        <h1 className='text-3xl md:text-5xl font-black mb-8 md:mb-10 text-yellow-400 drop-shadow-[3px_3px_0_rgba(220,38,38,1)] md:drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-widest'>
          ROGUE
        </h1>

        <div className='bg-black border-2 border-gray-700 px-4 md:px-6 py-2 md:py-3 rounded-xl mb-8'>
          <p className='text-xs md:text-sm text-gray-300 font-bold uppercase tracking-widest'>
            Local High Score: <span className='text-green-400 text-lg md:text-xl'>{highScore}</span>
          </p>
        </div>

        <div className='w-full max-w-xs mb-8'>
          {!playerName ? (
            <div className='flex flex-col gap-2'>
              <p className='text-[10px] md:text-xs text-gray-400 text-center uppercase tracking-widest'>
                Enter a name to track your runs
              </p>
              <div className='flex gap-2'>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
                  placeholder="Your name..."
                  maxLength={15}
                  className="flex-1 bg-gray-800 border border-gray-600 text-white text-xs md:text-sm px-3 py-2 rounded focus:outline-none focus:border-yellow-400"
                />
                <button
                  onClick={handleSetName}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs md:text-sm px-3 py-2 rounded cursor-pointer transition-colors"
                >
                  SET
                </button>
              </div>
            </div>
          ) : (
            <div className='flex flex-col items-center gap-2'>
              <p className='text-xs md:text-sm text-green-400 font-bold uppercase tracking-widest'>
                PLAYER: {playerName}
              </p>
              <button
                onClick={handleClearName}
                className="text-[10px] md:text-xs text-red-500 hover:text-white border border-red-500 hover:bg-red-500 px-3 py-1 rounded transition-colors cursor-pointer"
              >
                CLEAR NAME
              </button>
            </div>
          )}
        </div>

        <button
          onClick={startGame}
          className='group relative inline-flex items-center justify-center px-8 md:px-12 py-4 md:py-6 font-bold text-white transition-all duration-200 bg-red-600 border-2 md:border-4 border-white rounded-xl hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 active:scale-95 cursor-pointer'
        >
          <span className='absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-linear-to-b from-transparent via-transparent to-black' />
          <span className='relative text-xl md:text-2xl tracking-widest'>START RUN</span>
        </button>
      </div>
    </div>
  );
};