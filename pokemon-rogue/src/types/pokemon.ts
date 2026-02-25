import { type Move } from './move';

export interface Pokemon {
    id: number;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    speed: number;
    isPlayer: boolean;
    level?:number;
    moves?: Move[];
}