import { useState, useEffect } from 'react';

// Define the shape of our database documents
interface LeaderboardEntry {
  _id: string;
  name: string;
  pokemon: string;
  pokemonId: number;
  floor: number;
}

interface StartScreenProps {
  highScore: number;
  startGame: () => void;
}

export const StartScreen = ({ highScore, startGame }: StartScreenProps) => {
  // State to hold the live database scores
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the top 10 scores when the component mounts
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leaderboard');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setLeaderboard(data);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className='w-full max-w-5xl h-[600px] flex border-4 border-black rounded-lg overflow-hidden shadow-2xl font-mono'>
      
      {/* LEFT COLUMN: The Global Leaderboard */}
      <div className='w-1/2 bg-gray-900 border-r-4 border-black p-8 flex flex-col'>
        <h2 className='text-3xl font-black text-yellow-400 mb-2 tracking-widest'>GLOBAL</h2>
        <h2 className='text-xl font-bold text-white mb-6 border-b-4 border-gray-700 pb-4 tracking-widest'>LEADERBOARD</h2>
        
        {/* Leaderboard List */}
        <div className='flex-1 overflow-y-auto space-y-3 pr-2'>
          {isLoading ? (
            <div className="text-gray-400 text-center mt-10 animate-pulse">Establishing connection to server...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-gray-500 text-center mt-10">No runs recorded yet. Be the first!</div>
          ) : (
            leaderboard.map((entry, idx) => (
              <div key={entry._id} className='flex items-center gap-3 text-sm border-b border-gray-800 pb-2'>
                
                {/* 1. Rank */}
                <span className='text-gray-500 font-bold w-6 shrink-0'>#{idx + 1}</span>
                
                {/* 2. Name & Sprite */}
                <div className='flex-1 flex items-center gap-2 min-w-0 '>
                  <span className='text-white truncate' title={entry.name}>
                    {entry.name}
                  </span>
                  <img 
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.pokemonId}.png`} 
                    alt={entry.pokemon}
                    title={entry.pokemon}
                    className="w-8 h-8 pixelated shrink-0 drop-shadow-md"
                  />
                </div>

                {/* 3. Score */}
                <div className='text-green-400 font-bold shrink-0 text-right whitespace-nowrap'>
                  Area {Math.ceil(entry.floor / 5)} Floor {entry.floor}
                </div>
                
              </div>
            ))
          )}
        </div>

        {/* Auth Section */}
        <div className='mt-6 pt-6 border-t-4 border-gray-700'>
          <p className='text-xs text-gray-400 mb-3 text-center uppercase tracking-widest'>
            Login to record your runs
          </p>
        </div>
        <div className="flex justify-center">
          <button 
              onClick={() => console.log("Google Auth coming soon!")}
              className='w-1/9 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-4xl border-2 border-black flex justify-center gap-3 transition-transform active:scale-95 cursor-pointer'
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          </button>  
        </div>
      </div>

      {/* RIGHT COLUMN: Game Start Area */}
      <div className='w-1/2 bg-[#1a1a24] flex flex-col items-center justify-center p-8 relative overflow-hidden'>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className='z-10 flex flex-col items-center'>
          <h1 className='text-6xl font-black mb-2 text-white drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-tighter text-center leading-none'>
            POKÉMON
          </h1>
          <h1 className='text-5xl font-black mb-12 text-yellow-400 drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-widest'>
            ROGUE
          </h1>

          <div className='bg-black border-2 border-gray-700 px-6 py-3 rounded-xl mb-12'>
            <p className='text-gray-300 font-bold uppercase tracking-widest'>
              Local High Score: <span className='text-green-400 text-xl'>{highScore}</span>
            </p>
          </div>

          <button 
            onClick={startGame}
            className='group relative inline-flex items-center justify-center px-12 py-6 font-bold text-white transition-all duration-200 bg-red-600 border-4 border-white rounded-xl hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 active:scale-95 cursor-pointer'
          >
            <span className='absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black'></span>
            <span className='relative text-2xl tracking-widest'>START RUN</span>
          </button>
        </div>
      </div>

    </div>
  );
};