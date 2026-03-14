import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Pokemon } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export type DungeonModifier = 'none' | 'volcanic' | 'thick-fog' | 'electric-terrain' | 'hail';

// FIX: Added 'export' to the interface
export interface GameState {
  userProfile: UserProfile | null;
  player: Pokemon | null;
  enemy: Pokemon | null;
  floor: number;
  highScore: number;
  upgrades: Upgrade[];
  gameLog: string[];
  isGameStarted: 'START' | 'SELECT' | 'BATTLE';
  playerTurn: boolean;
  playerAnimation: string;
  enemyAnimation: string;
  pendingMove: Move | null;
  dungeonModifier: DungeonModifier;

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
  setPendingMove: (move: Move | null) => void;
  setDungeonModifier: (mod: DungeonModifier) => void;
  
  resetRun: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
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
      pendingMove: null,
      dungeonModifier: 'none',

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
      },
      setPendingMove: (pendingMove) => set({ pendingMove }),
      setDungeonModifier: (dungeonModifier) => set({ dungeonModifier }),
      
      resetRun: () => set({
        player: null,
        enemy: null,
        floor: 1,
        upgrades: [],
        gameLog: [],
        isGameStarted: 'START',
        playerTurn: true,
        pendingMove: null,
        dungeonModifier: 'none'
      }),
    }),
    {
      name: 'pokemon-rogue-save',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        player: state.player, 
        enemy: state.enemy, 
        floor: state.floor, 
        gameLog: state.gameLog, 
        isGameStarted: state.isGameStarted,
        dungeonModifier: state.dungeonModifier,
        upgrades: state.upgrades
      }),
    }
  )
);