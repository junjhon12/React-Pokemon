interface StartScreenProps {
  highScore: number;
  startGame: () => void;
}

export const StartScreen = ({ highScore, startGame }: StartScreenProps) => {
  // Added a massive dummy name to prove the UI won't break
  const dummyLeaderboard = [
    { name: "xX_Dark_Sephiroth_Master_Xx_99", pokemon: "Mewtwo", pokemonId: 150, floor: 50 },
    { name: "AshKetchum", pokemon: "Charizard", pokemonId: 6, floor: 25 },
    { name: "GaryOak", pokemon: "Blastoise", pokemonId: 9, floor: 22 },
    { name: "BugCatcher", pokemon: "Butterfree", pokemonId: 12, floor: 4 },
  ];

  return (
    <div className='w-full max-w-5xl h-150 flex border-4 border-black rounded-lg overflow-hidden shadow-2xl font-mono'>
      
      {/* LEFT COLUMN: The Global Leaderboard */}
      <div className='w-1/2 bg-gray-900 border-r-4 border-black p-8 flex flex-col'>
        <h2 className='text-3xl font-black text-yellow-400 mb-2 tracking-widest'>GLOBAL</h2>
        <h2 className='text-xl font-bold text-white mb-6 border-b-4 border-gray-700 pb-4 tracking-widest'>LEADERBOARD</h2>
        
        {/* Leaderboard List */}
        <div className='flex-1 overflow-y-auto space-y-3 pr-2'>
          {dummyLeaderboard.map((entry, idx) => (
            <div key={idx} className='flex items-center gap-3 text-sm border-b border-gray-800 pb-2'>
              
              {/* 1. Rank: Locked width so the names all align perfectly */}
              <span className='text-gray-500 font-bold w-6 shrink-0'>#{idx + 1}</span>
              
              {/* 2. Name & Sprite: Flexible container that forces text truncation */}
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

              {/* 3. Score: Locked width, never wraps, never shrinks */}
              <div className='text-green-400 font-bold shrink-0 text-right whitespace-nowrap'>
                Area {Math.ceil(entry.floor / 5)} Floor {entry.floor}
              </div>
              
            </div>
          ))}
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
        {/* Background Grid Pattern */}
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
            <span className='absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-linear-to-b from-transparent via-transparent to-black'></span>
            <span className='relative text-2xl tracking-widest'>START RUN</span>
          </button>
        </div>
      </div>

    </div>
  );
};