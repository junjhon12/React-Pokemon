interface HealthBarProps {
  hp: number;
  maxHp: number;
  isPlayer?: boolean;
  xpProgress?: number; // 0 to 100
}

export const HealthBar = ({ hp, maxHp, isPlayer, xpProgress }: HealthBarProps) => {
  const percent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  // Professional color logic
  const color = percent < 20 ? 'bg-red-500' : percent < 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full bg-gray-950 border-2 border-gray-800 rounded-md overflow-hidden flex flex-col shadow-inner">
      {/* HP Bar Layer */}
      <div className="h-3 relative">
        <div 
          className={`${color} h-full transition-all duration-500 ease-out shadow-[inset_0_1px_rgba(255,255,255,0.3)]`}
          style={{ width: `${percent}%` }} 
        />
      </div>
      
      {/* Integrated XP Bar (Thin underline) */}
      {isPlayer && xpProgress !== undefined && (
        <div className="h-1 bg-gray-900 w-full border-t border-black/40">
          <div 
            className="h-full bg-cyan-400 transition-all duration-700 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};