export interface Upgrade {
  id: string;
  name: string;
  description: string;
  stat: 'hp' | 'attack' | 'speed' | 'maxHp' | 'evolve';
  amount: number;
}