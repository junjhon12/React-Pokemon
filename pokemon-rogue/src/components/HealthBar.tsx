interface HealthBarProps {
  hp: number;
  maxHp: number;
}

export const HealthBar = ({ hp, maxHp }: HealthBarProps) => {
  const percent = maxHp > 0 ? (hp / maxHp) * 100 : 0;
  // Color logic: Red (<20%), Yellow (<50%), Green (>50%)
  const color = percent < 20 ? 'bg-red-500' : percent < 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="w-full bg-slate-300 rounded-full h-4 overflow-hidden border border-slate-400">
      <div 
        className={`${color} h-full transition-all duration-500 ease-out`}
        style={{ width: `${percent}%` }} 
      />
    </div>
  );
};