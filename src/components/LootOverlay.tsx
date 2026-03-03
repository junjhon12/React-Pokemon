import { type Upgrade } from '../types/upgrade';

interface LootOverlayProps {
  upgrades: Upgrade[];
  handleSelectUpgrade: (upgrade: Upgrade) => void;
}

export const LootOverlay = ({ upgrades, handleSelectUpgrade }: LootOverlayProps) => {
  if (upgrades.length === 0) return null;

  return (
    // Added p-4 to ensure content doesn't touch the screen edges on small devices
    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <h2 className="text-xl md:text-3xl font-black text-yellow-400 mb-4 md:mb-8 drop-shadow-md text-center leading-tight">
        CHOOSE REWARD
      </h2>
      
      {/* Mobile: flex-col (stacked), Desktop: flex-row (side-by-side) */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full max-w-xs md:max-w-none justify-center">
        {upgrades.map((u) => (
          <button
            key={u.id}
            onClick={() => handleSelectUpgrade(u)}
            className={`bg-gray-800 border-2 md:border-4 ${
              u.stat === 'equipment' 
                ? 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] md:shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                : 'border-yellow-500'
            } p-3 md:p-4 rounded-lg md:rounded-xl hover:bg-gray-700 transition-all text-white w-full md:w-52 flex flex-row md:flex-col items-center text-left md:text-center cursor-pointer`}
          >
            {u.equipment && (
              // Mobile: Icon pushed to the left. Desktop: Icon centered on top.
              <div className="bg-white/10 p-1 md:p-2 rounded-full mr-3 md:mr-0 md:mb-3 shrink-0">
                <img 
                  src={u.equipment.spriteUrl} 
                  alt={u.name} 
                  className="w-8 h-8 md:w-12 md:h-12 object-contain pixelated drop-shadow-xl" 
                />
              </div>
            )}
            
            {/* Wrapper to control text alignment properly between row and column layouts */}
            <div className="flex flex-col flex-1 justify-center">
              <span className="text-sm md:text-xl font-bold uppercase leading-tight">
                {u.name}
              </span>
              
              {u.stat === 'equipment' && (
                <span className="text-[8px] md:text-[10px] text-purple-400 tracking-widest font-black uppercase md:mt-1">
                  Held Item
                </span>
              )}
              
              <span className="text-[10px] md:text-xs text-gray-300 mt-1 md:mt-2 leading-snug">
                {u.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};