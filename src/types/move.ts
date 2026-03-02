export interface Move {
    name: string;
    type: 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';
    power: number;
    accuracy: number;
    pp:number;
    priority?: boolean;
    statusEffect?: 'burn' | 'poison' | 'paralyze' | 'freeze' | 'stunned';
}