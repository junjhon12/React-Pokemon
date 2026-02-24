import { type Pokemon } from '../types/pokemon';

export const playerMon: Pokemon = {
    id: 1,
    name: 'Pikachu',
    hp: 10,
    maxHp: 10,
    attack: 5,
    speed: 5,
    isPlayer: true
};

export const enemyMon: Pokemon = {
    id: 2,
    name: 'Charmander',
    hp: 10,
    maxHp: 10,
    attack: 5,
    speed: 5,
    isPlayer: false
};