import  { type Pokemon } from '../types/pokemon';

interface PokemonCardProps {
    pokemon: Pokemon;
}

export const PokemonCard = ({pokemon} : PokemonCardProps) => {
    return (
        <div className='border-2 border-slate-800 p-2 rounded-xl bg-slate-100 w-52 text-black'>
            <p className='text-xl font-bold'>{pokemon.name}</p>
            <p>HP: {pokemon.hp}/{pokemon.maxHp}</p>
            <p>Attack: {pokemon.attack}</p>
            <p>Speed: {pokemon.speed}</p>
        </div>
    )
}