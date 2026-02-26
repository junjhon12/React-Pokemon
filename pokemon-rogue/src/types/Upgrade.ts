import { type StatKey } from './pokemon';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  stat: StatKey | 'evolve';
  amount: number;
}