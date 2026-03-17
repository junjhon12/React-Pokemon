// src/playerPokemonSelection.tsx
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

const GEN_LABEL: Record<number, string> = {
  1: 'GEN I',   4: 'GEN I',   7: 'GEN I',
  152: 'GEN II', 155: 'GEN II', 158: 'GEN II',
  252: 'GEN III', 255: 'GEN III', 258: 'GEN III',
};

export const StarterSelection = ({ onSelectStarter }: StarterSelectionProps) => {
  const [cards, setCards] = useState<TCGCard[]>([]);

  useEffect(() => {
    const getCards = async () => {
      const fetchedCards = (await fetchPokemonCard()) as (TCGCard | undefined)[];
      if (fetchedCards && fetchedCards.length > 0) {
        const validCards = fetchedCards.filter((card): card is TCGCard => !!card);
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
    <div className="flex flex-col items-center justify-start min-h-screen bg-black py-10 px-4">
      <h1 className="text-4xl text-yellow-400 font-bold mb-2 tracking-widest animate-pulse text-center">
        CHOOSE YOUR STARTER
      </h1>
      <p className="text-gray-400 text-sm font-mono mb-8 tracking-widest uppercase">
        Gen I · Gen II · Gen III
      </p>

      {cards.length === 0 ? (
        <p className="text-white text-xl animate-pulse font-mono">Loading Cards...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl">
          {cards.map((card) => {
            const dexId = card.dexId?.[0] ?? 1;
            const gen   = GEN_LABEL[dexId] ?? '';
            return (
              <button
                key={card.id}
                onClick={() => onSelectStarter(dexId)}
                className="flex flex-col items-center gap-2 transition-transform duration-300 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,255,255,0.4)] rounded-xl cursor-pointer bg-transparent border-none p-0 group"
              >
                <div className="relative w-full">
                  <img
                    src={`${card.image}/high.png`}
                    alt={card.name}
                    className="w-full rounded-xl"
                    onError={(e) => {
                      // Fall back to official artwork if TCGdex image fails
                      (e.target as HTMLImageElement).src =
                        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexId}.png`;
                    }}
                  />
                  {gen && (
                    <span className="absolute top-2 left-2 bg-black/70 text-yellow-400 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border border-yellow-400/40">
                      {gen}
                    </span>
                  )}
                </div>
                <span className="text-white font-bold text-sm tracking-wider uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                  {card.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};