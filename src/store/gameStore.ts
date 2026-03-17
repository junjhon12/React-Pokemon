// src/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Pokemon } from '../types/pokemon';
import type { Upgrade } from '../types/upgrade';
import type { Move } from '../types/move';

export type DungeonModifier = 'none' | 'volcanic' | 'thick-fog' | 'electric-terrain' | 'hail';

export interface GameState {
  playerName: string | null;
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

  setPlayerName: (name: string | null) => void;
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

// Backfills missing specialAttack / specialDefense on a saved Pokemon so that
// stale localStorage state doesn't produce NaN in the stats panel.
const migratePokemon = (mon: Pokemon | null): Pokemon | null => {
  if (!mon) return null;
  const stats = { ...mon.stats };
  if (stats.specialAttack  === undefined) stats.specialAttack  = stats.attack  ?? 5;
  if (stats.specialDefense === undefined) stats.specialDefense = stats.defense ?? 5;
  return { ...mon, stats };
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      playerName:      null,
      player:          null,
      enemy:           null,
      floor:           1,
      highScore:       parseInt(localStorage.getItem('rogue-score') || '0'),
      upgrades:        [],
      gameLog:         [],
      isGameStarted:   'START',
      playerTurn:      true,
      playerAnimation: '',
      enemyAnimation:  '',
      pendingMove:     null,
      dungeonModifier: 'none',

      setPlayerName:      (playerName)      => set({ playerName }),
      setPlayer:          (player)          => set({ player }),
      setEnemy:           (enemy)           => set({ enemy }),
      setFloor:           (floor)           => set({ floor }),
      setUpgrades:        (upgrades)        => set({ upgrades }),
      addGameLog:         (messages)        => set((state) => ({
        gameLog: [...state.gameLog, ...messages].slice(-100),
      })),
      setIsGameStarted:   (isGameStarted)   => set({ isGameStarted }),
      setPlayerTurn:      (playerTurn)      => set({ playerTurn }),
      setPlayerAnimation: (playerAnimation) => set({ playerAnimation }),
      setEnemyAnimation:  (enemyAnimation)  => set({ enemyAnimation }),
      setHighScore: (score) => {
        localStorage.setItem('rogue-score', score.toString());
        set({ highScore: score });
      },
      setPendingMove:     (pendingMove)     => set({ pendingMove }),
      setDungeonModifier: (dungeonModifier) => set({ dungeonModifier }),

      resetRun: () => set({
        player:          null,
        enemy:           null,
        floor:           1,
        upgrades:        [],
        gameLog:         [],
        isGameStarted:   'START',
        playerTurn:      true,
        pendingMove:     null,
        dungeonModifier: 'none',
        playerAnimation: '',
        enemyAnimation:  '',
      }),
    }),
    {
      name:    'pokemon-rogue-save',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        player:        state.player,
        enemy:         state.enemy,
        floor:         state.floor,
        isGameStarted: state.isGameStarted,
        upgrades:      state.upgrades,
        playerName:    state.playerName,
      }),
      // Migrate saved state: backfill specialAttack/specialDefense if missing.
      // Also bumps version so any truly incompatible old saves are wiped cleanly.
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<GameState>;
        if (version < 2) {
          state.player = migratePokemon(state.player ?? null);
          state.enemy  = migratePokemon(state.enemy  ?? null);
        }
        return state as GameState;
      },
    }
  )
);