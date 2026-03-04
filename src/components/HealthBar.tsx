interface HealthBarProps {
  hp: number;
  maxHp: number;
  isPlayer?: boolean;
  xpProgress?: number; // 0 to 100
}

export const HealthBar = ({ hp, maxHp, isPlayer, xpProgress }: HealthBarProps) => {
  const percent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  // Color logic: Red (<20%), Yellow (<50%), Green (>50%)
  const color = percent < 20 ? 'bg-red-500' : percent < 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full flex flex-col gap-1">
      {/* HP Bar */}
      <div className="w-full bg-slate-300 rounded-full h-4 overflow-hidden border border-slate-400">
        <div 
          className={`${color} h-full transition-all duration-500 ease-out`}
          style={{ width: `${percent}%` }} 
        />
      </div>
      
      {/* XP Bar (Only for Player) */}
      {isPlayer && xpProgress !== undefined && (
        <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden border border-black/20">
          <div 
            className="bg-blue-400 h-full transition-all duration-500 shadow-[0_0_5px_rgba(96,165,250,0.5)]"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};