import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useGameStore } from '../store/gameStore';

const API_URL = import.meta.env.PROD 
  ? 'https://pokemon-rogue-api.onrender.com' 
  : 'http://localhost:5000';

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { setUserProfile, userProfile } = useGameStore();

  useEffect(() => {
    const savedName = localStorage.getItem('rogue-player-name');
    if (savedName && !userProfile) {
       setUserProfile({
         name: savedName,
         email: '',
         picture: '' 
       });
    }
  }, [userProfile, setUserProfile]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_URL}/api/leaderboard`);
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

  const handleLoginSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const googleName = decoded.name.replace(/\s+/g, '').slice(0, 15);
      
      setUserProfile({
        name: googleName,
        email: decoded.email,
        picture: decoded.picture
      });

      localStorage.setItem('rogue-player-name', googleName);
      localStorage.setItem('rogue-google-token', credentialResponse.credential);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rogue-player-name');
    localStorage.removeItem('rogue-google-token');
    setUserProfile(null); 
  };

  return (
    // 1. Main Container: Switched to flex-col-reverse on mobile, md:flex-row on desktop. Adjusted height to natural on mobile.
    <div className='w-full max-w-5xl min-h-[90vh] md:min-h-0 md:h-150 flex flex-col-reverse md:flex-row md:border-4 border-black md:rounded-lg overflow-hidden shadow-2xl font-mono'>
      
      {/* LEFT COLUMN (Leaderboard): Full width on mobile, 1/2 width on desktop. order-2 visually via flex-col-reverse */}
      <div className='w-full md:w-1/2 bg-gray-900 md:border-r-4 border-t-4 md:border-t-0 border-black p-4 md:p-8 flex flex-col min-h-[50vh] md:min-h-0'>
        <h2 className='text-2xl md:text-3xl font-black text-yellow-400 mb-1 md:mb-2 tracking-widest'>GLOBAL</h2>
        <h2 className='text-lg md:text-xl font-bold text-white mb-4 md:mb-6 border-b-4 border-gray-700 pb-2 md:pb-4 tracking-widest'>LEADERBOARD</h2>
        
        <div className='flex-1 overflow-y-auto space-y-3 pr-2'>
          {isLoading ? (
            <div className="text-gray-400 text-center mt-10 animate-pulse">Establishing connection to server...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-gray-500 text-center mt-10">No runs recorded yet. Be the first!</div>
          ) : (
            leaderboard.map((entry, idx) => (
              <div key={entry._id} className='flex items-center gap-2 md:gap-3 text-xs md:text-sm border-b border-gray-800 pb-2'>
                <span className='text-gray-500 font-bold w-5 md:w-6 shrink-0'>#{idx + 1}</span>
                <div className='flex-1 flex items-center gap-2 min-w-0 '>
                  <span className='text-white truncate' title={entry.name}>
                    {entry.name}
                  </span>
                  <img 
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.pokemonId}.png`} 
                    alt={entry.pokemon}
                    title={entry.pokemon}
                    className="w-6 h-6 md:w-8 md:h-8 pixelated shrink-0 drop-shadow-md"
                  />
                </div>
                <div className='text-green-400 font-bold shrink-0 text-right whitespace-nowrap'>
                  Area {Math.ceil(entry.floor / 5)} Floor {entry.floor}
                </div>
              </div>
            ))
          )}
        </div>

        <div className='mt-4 md:mt-6 pt-4 md:pt-6 border-t-4 border-gray-700'>
          {!userProfile ? (
            <>
              <p className='text-[10px] md:text-xs text-gray-400 mb-3 text-center uppercase tracking-widest'>
                Login to record your runs
              </p>
              <div className="flex justify-center scale-90 md:scale-100">
                <GoogleLogin
                  onSuccess={handleLoginSuccess}
                  onError={() => {
                    console.error('Login Failed');
                  }}
                  theme="filled_black"
                  shape="pill"
                />
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-xs md:text-sm text-green-400 font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                {userProfile.picture && (
                  <img src={userProfile.picture} alt="profile" className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-green-400" />
                )}
                ACTIVE LINK: {userProfile.name}
              </p>
              <button 
                onClick={handleLogout}
                className="text-[10px] md:text-xs text-red-500 hover:text-white border border-red-500 hover:bg-red-500 px-3 py-1 rounded transition-colors cursor-pointer"
              >
                DISCONNECT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN (Start Area): Full width on mobile, 1/2 width on desktop. order-1 visually via flex-col-reverse */}
      <div className='w-full md:w-1/2 bg-[#1a1a24] flex flex-col items-center justify-center p-6 md:p-8 relative overflow-hidden min-h-[50vh] md:min-h-0'>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <div className='z-10 flex flex-col items-center'>
          {/* Scaled down typography for mobile */}
          <h1 className='text-5xl md:text-6xl font-black mb-1 md:mb-2 text-white drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-tighter text-center leading-none'>
            POKÉMON
          </h1>
          <h1 className='text-3xl md:text-5xl font-black mb-8 md:mb-12 text-yellow-400 drop-shadow-[3px_3px_0_rgba(220,38,38,1)] md:drop-shadow-[4px_4px_0_rgba(220,38,38,1)] tracking-widest'>
            ROGUE
          </h1>

          <div className='bg-black border-2 border-gray-700 px-4 md:px-6 py-2 md:py-3 rounded-xl mb-8 md:mb-12'>
            <p className='text-xs md:text-sm text-gray-300 font-bold uppercase tracking-widest'>
              Local High Score: <span className='text-green-400 text-lg md:text-xl'>{highScore}</span>
            </p>
          </div>

          <button 
            onClick={startGame}
            className='group relative inline-flex items-center justify-center px-8 md:px-12 py-4 md:py-6 font-bold text-white transition-all duration-200 bg-red-600 border-2 md:border-4 border-white rounded-xl hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 active:scale-95 cursor-pointer'
          >
            <span className='absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-linear-to-b from-transparent via-transparent to-black'></span>
            <span className='relative text-xl md:text-2xl tracking-widest'>START RUN</span>
          </button>
        </div>
      </div>

    </div>
  );
};