import { type Upgrade } from '../types/upgrade';

interface LootOverlayProps {
  upgrades: Upgrade[];
  handleSelectUpgrade: (upgrade: Upgrade) => void;
}

export const LootOverlay = ({ upgrades, handleSelectUpgrade }: LootOverlayProps) => {
  if (upgrades.length === 0) return null;

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
      <h2 className="text-3xl font-black text-yellow-400 mb-8 drop-shadow-md">CHOOSE REWARD</h2>
      <div className="flex gap-4">
        {upgrades.map((u) => (
          <button
            key={u.id}
            onClick={() => handleSelectUpgrade(u)}
            className={`bg-gray-800 border-4 ${u.stat === 'equipment' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-yellow-500'} p-4 rounded-xl hover:bg-gray-700 transition-all text-white w-52 flex flex-col items-center cursor-pointer`}
          >
            {u.equipment && (
              <div className="bg-white/10 p-2 rounded-full mb-3">
                <img src={u.equipment.spriteUrl} alt={u.name} className="w-12 h-12 object-contain pixelated drop-shadow-xl" />
              </div>
            )}
            <span className="text-xl font-bold text-center uppercase">{u.name}</span>
            {u.stat === 'equipment' && <span className="text-[10px] text-purple-400 tracking-widest font-black uppercase mt-1">Held Item</span>}
            <span className="text-xs text-gray-300 text-center mt-2">{u.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};