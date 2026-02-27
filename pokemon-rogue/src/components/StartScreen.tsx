interface StartScreenProps {
  highScore: number;
  startGame: () => void;
}

export const StartScreen = ({ highScore, startGame }: StartScreenProps) => {
  return (
    <div className="text-center space-y-8 text-white">
      <h1 className="text-6xl font-bold text-yellow-400 tracking-tighter animate-pulse">
        POKÉ-ROGUE
      </h1>
      <div className="border-4 border-slate-700 p-8 rounded-xl bg-slate-900">
        <p className="text-slate-400 mb-2">BEST RUN</p>
        <p className="text-4xl text-green-400 font-bold">FLOOR {highScore}</p>
      </div>
      <button 
        onClick={startGame}
        className="bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-4 px-12 rounded-full border-4 border-red-800 shadow-lg hover:scale-105 transition-all cursor-pointer"
      >
        START RUN
      </button>
    </div>
  );
};