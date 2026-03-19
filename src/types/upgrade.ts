import { type StatKey } from './pokemon';
import { type Equipment } from './equipment';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  stat: StatKey | 'evolve' | 'equipment' | 'status';
  amount: number;
  equipment?: Equipment;
}