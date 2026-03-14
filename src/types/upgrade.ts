// src/types/upgrade.ts
import { type StatKey } from './pokemon';
import { type Equipment } from './equipment';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  // FIX: Added 'status' to the allowed literal types
  stat: StatKey | 'evolve' | 'equipment' | 'status'; 
  amount: number;
  equipment?: Equipment;
}