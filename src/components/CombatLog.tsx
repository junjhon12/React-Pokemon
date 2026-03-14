import React, { useEffect, useRef } from 'react';

interface CombatLogProps {
  gameLog: string[];
}

export const CombatLog = ({ gameLog }: CombatLogProps) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Keep the log scrolled to the bottom automatically
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [gameLog]);

  return (
    <div 
      ref={logContainerRef} 
      className='order-4 md:order-2 w-full h-32 md:h-32 bg-black text-green-400 p-3 md:p-4 overflow-y-auto text-xs md:text-sm font-mono border-y-4 md:border-t-0 md:border-b-4 border-black shrink-0 shadow-inner'
    >
      {gameLog.map((log, i) => (
        <p key={i} className="mb-1">{log}</p>
      ))}
    </div>
  );
};