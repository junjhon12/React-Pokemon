interface XpBarProps {
    xp: number;
    maxXp: number;
}

export const XpBar: React.FC<XpBarProps> = ({xp, maxXp}) => {
    const percentage = maxXp > 0 ? (xp / maxXp) * 100 : 0;
    
    return (
        <div className="w-full bg-slate-800 rounded-full h-2 mt-1 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{width: `${percentage}`}}/>
        </div>
    );
};
