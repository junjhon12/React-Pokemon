import { useEffect, useState } from 'react';
import { fetchPokemonCard } from './utils/api'; 

interface TCGCard {
  id: string;
  name: string;
  image?: string;
  localId?: string; 
  dexId?: number[]; 
}

interface StarterSelectionProps {
  onSelectStarter: (pokedexId: number) => void; 
}

export const StarterSelection = ({ onSelectStarter }: StarterSelectionProps) => {
  const [cards, setCards] = useState<TCGCard[]>([]);

  useEffect(() => {
    const getCards = async () => {
      // Cast the fetch response so TS knows exactly what it's working with
      const fetchedCards = (await fetchPokemonCard()) as (TCGCard | undefined)[];
      
      if (fetchedCards && fetchedCards.length > 0) {
        
        // Safely extract valid cards and assert the type
        const validCards = fetchedCards.filter((card): card is TCGCard => !!card);
        
        // Sort safely with strict fallbacks
        const sorted = validCards.sort((a, b) => {
          const idA = a.dexId && a.dexId.length > 0 ? a.dexId[0] : 0;
          const idB = b.dexId && b.dexId.length > 0 ? b.dexId[0] : 0;
          return idA - idB;
        });
        
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
              onClick={() => onSelectStarter(card.dexId?.[0] ?? 1)}
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