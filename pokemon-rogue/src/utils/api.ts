import { type Pokemon } from '../types/pokemon';

const Pokemon_API_URL = 'https://pokeapi.co/api/v2/pokemon';

export const getRandomPokemon = async (id: number) : Promise<Pokemon> => {
    const response = await fetch(`${Pokemon_API_URL}/${id}`);
    const data = await response.json();

    const hp = data.stats.find((s:any) => s.stat.name === 'hp').base_stat;
    const attack = data.stats.find((s:any) => s.stat.name === 'attack').base_stat;
    const speed = data.stats.find((s:any) => s.stat.name === 'speed').base_stat;

    return {
        id: data.id,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        hp: hp,
        maxHp: hp,
        attack: attack,
        speed: speed,
        isPlayer: false
    };
};