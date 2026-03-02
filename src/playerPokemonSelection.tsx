import { useEffect, useState } from 'react';
import { fetchPokemonCard } from './utils/api'; 

interface StarterSelectionProps {
  onSelectStarter: (pokedexId: number) => void; 
}

export const StarterSelection = ({ onSelectStarter }: StarterSelectionProps) => {
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    const getCards = async () => {
      const fetchedCards = await fetchPokemonCard();
      if (fetchedCards && fetchedCards.length > 0) {
        // Sorts cards by Pokedex number (dexId) so Bulbasaur is always first
        const sorted = [...fetchedCards].sort((a, b) => (a.dexId?.[0] || 0) - (b.dexId?.[0] || 0));
        setCards(sorted);
      }
    };
    getCards();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <h1 className="text-4xl text-yellow-400 font-bold mb-10 tracking-widest animate-pulse">CHOOSE YOUR STARTER</h1>
      
      {cards.length === 0 ? (
        <p className="text-white text-xl animate-pulse font-mono">Loading Cards from TCGdex...</p>
      ) : (
        <div className="flex gap-8">
          {cards.map((card) => (
            <button 
              key={card.id}
              // TCGdex exposes the national pokedex array under 'dexId'
              onClick={() => onSelectStarter(card.dexId?.[0])}
              className="transition-transform duration-300 hover:-translate-y-4 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] rounded-xl cursor-pointer bg-transparent border-none p-0"
            >
              {/* TCGdex requires you to append the resolution to the image base URL */}
              <img src={`${card.image}/high.png`} alt={card.name} className="w-64 rounded-xl" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};