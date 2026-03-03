import { create } from 'zustand';
import type { Pokemon } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';

// Define the shape of the user profile we get from Google
export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

// 1. Define the shape of our entire game's state
interface GameState {
  // User State
  userProfile: UserProfile | null;

  // Data State
  player: Pokemon | null;
  enemy: Pokemon | null;
  floor: number;
  highScore: number;
  upgrades: Upgrade[];
  gameLog: string[];
  
  // Game Flow State
  isGameStarted: 'START' | 'SELECT' | 'BATTLE';
  playerTurn: boolean;
  playerAnimation: string;
  enemyAnimation: string;

  // Actions
  setUserProfile: (profile: UserProfile | null) => void;
  setPlayer: (player: Pokemon | null) => void;
  setEnemy: (enemy: Pokemon | null) => void;
  setFloor: (floor: number) => void;
  setUpgrades: (upgrades: Upgrade[]) => void;
  addGameLog: (messages: string[]) => void;
  setIsGameStarted: (status: 'START' | 'SELECT' | 'BATTLE') => void;
  setPlayerTurn: (isTurn: boolean) => void;
  setPlayerAnimation: (anim: string) => void;
  setEnemyAnimation: (anim: string) => void;
  setHighScore: (score: number) => void;
}

// 2. Create the actual store
export const useGameStore = create<GameState>((set) => ({
  // Initial State Values
  userProfile: null,
  player: null,
  enemy: null,
  floor: 1,
  highScore: parseInt(localStorage.getItem('rogue-score') || '0'),
  upgrades: [],
  gameLog: [],
  isGameStarted: 'START',
  playerTurn: true,
  playerAnimation: '',
  enemyAnimation: '',

  // Action Implementations
  setUserProfile: (userProfile) => set({ userProfile }),
  setPlayer: (player) => set({ player }),
  setEnemy: (enemy) => set({ enemy }),
  setFloor: (floor) => set({ floor }),
  setUpgrades: (upgrades) => set({ upgrades }),
  
  addGameLog: (messages) => set((state) => ({ gameLog: [...state.gameLog, ...messages] })),
  
  setIsGameStarted: (isGameStarted) => set({ isGameStarted }),
  setPlayerTurn: (playerTurn) => set({ playerTurn }),
  setPlayerAnimation: (playerAnimation) => set({ playerAnimation }),
  setEnemyAnimation: (enemyAnimation) => set({ enemyAnimation }),
  setHighScore: (score) => {
    localStorage.setItem('rogue-score', score.toString());
    set({ highScore: score });
  }
}));