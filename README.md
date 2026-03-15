# Poké-Rogue 👾
### Browser-Based Infinite Roguelike Engine

---

## Table of Contents
1. [Introduction](#introduction)
2. [Technologies Used](#technologies-used)
3. [Launch & Local Development](#launch--local-development)
4. [Scope of Functions](#scope-of-functions)
5. [Use Examples](#use-examples)
6. [Project Status](#project-status)
7. [Sources](#sources)

---

## Introduction

Poké-Rogue is a technical demonstration of a browser-based, infinite-progression roguelike built using modern web standards. The project's primary objective is to showcase:

- **Complex State-Machine Management**: Orchestrating a multi-stage battle loop and progression system using Zustand with persisted localStorage state.
- **Asynchronous Data Resolution**: Fetching and normalizing live data from external APIs in parallel to ensure a seamless user experience.
- **Dynamic UI Rendering**: Creating a responsive, data-driven dashboard that scales with player progression.
- **Pure Functional Game Logic**: Combat calculations, type effectiveness, and stat scaling are implemented as pure functions, making them independently testable and easy to extend.

---

## Technologies Used

- **Core**: React 19, TypeScript
- **State Management**: Zustand (with localStorage persistence)
- **Styling**: Tailwind CSS 4, PostCSS, Autoprefixer
- **Build Tool**: Vite
- **Backend**: Express (minimal health-check server)
- **SDKs**: TCGDex SDK (card-based starter selection data)
- **Testing**: Vitest

### Tech Stack Badges
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

---

## Launch & Local Development

### 🌐 Live Demo
[Play Poké-Rogue here](https://junjhon12.github.io/React-Pokemon/)

### 💻 Local Setup
To run this project locally, ensure you have **Node.js** installed:

1. **Clone the repository**:
    ```bash
    git clone https://github.com/junjhon12/React-Pokemon.git
    ```
2. **Install dependencies**:
    ```bash
    npm install
    ```
3. **Run in development mode**:
    ```bash
    npm run dev
    ```

---

## Scope of Functions

### Battle Engine
A turn-based combat system with speed-based initiative. On each turn the engine checks status conditions, resolves accuracy and dodge, calculates damage, applies status effects on hit, and ticks burn/poison damage at the end of the turn. Key modifiers applied per hit:

- **STAB** (Same-Type Attack Bonus): 1.5× damage when the attacker's type matches the move type.
- **Type Effectiveness**: Full generation 1–6 chart with super effective (2×/4×), resisted (0.5×/0.25×), and immune (0×) matchups across dual types.
- **Critical Hits**: Stat-based crit chance, boosted by equipment like Scope Lens.
- **Double Strike**: When the attacker's Speed is at least 1.5× the defender's, there is a 30% chance to hit twice.
- **Weather Multipliers**: Volcanic arenas boost Fire moves 1.5×; Electric Terrain arenas boost Electric moves 1.5×.

### Status Effect Engine
Pre-turn checks for Paralyze (25% skip chance), Sleep (67% skip chance, 33% wake), and Freeze (80% skip chance, 20% thaw). End-of-turn ticking for Burn and Poison at 1/16 max HP per round. Status conditions are displayed as colored badges (BRN / PSN / PAR / FRZ / SLP) on the Pokémon card.

### AI System
Normal floors use random move selection. Mini-boss floors (every 5th) use a partial smart AI that prioritizes super effective moves. Boss floors (every 10th) use full smart AI: super effective moves first, strongest neutral move as fallback, and support moves when HP is critically low.

### Infinite Progression Architecture
Enemy stats scale with a 6% compounding multiplier per floor (`Math.pow(1.06, floor - 1)`). Every 5th floor triggers a dungeon mutation (Volcanic, Thick Fog, Electric Terrain, or Hail) with unique visual and mechanical effects. Mini-bosses at floors divisible by 5 receive 1.5× HP and boosted offensive stats. Legendary bosses at floors divisible by 10 receive 2.5× HP and significantly boosted attack, defense, and speed.

### Loot & Upgrade System
After each victory, the player receives a loot pool of up to 3 rewards with no duplicates. Every pool includes a guaranteed Potion (or Super Potion after a boss). There is a 35% chance for an equipment slot to be rolled if the player has fewer than 6 held items. Remaining slots are filled from stat upgrades (Attack, Defense, Speed, Max HP, Crit Chance), Evolution Stones (when applicable), or Full Heals (when a status condition is active).

### Equipment System
Up to 6 held items equipped simultaneously, displayed as orbital slots around the player sprite. Stat modifiers apply dynamically at calculation time via `getEffectiveStat`, meaning no base stats are mutated. Items can have negative modifiers (e.g. Iron Ball reduces Speed).

### Move & Leveling System
Players can hold up to 4 moves. PP is scaled by move power at the start of the run. Enemies drop random move scrolls with a 25% chance per room. On level-up, learnset moves are automatically offered. When all 4 move slots are full, a move replacement overlay is shown allowing the player to swap or skip.

### Evolution System
A dictionary-based `EVOLUTION_MAP` triggers evolution sequences when an Evolution Stone reward is selected. The evolved Pokémon inherits the player's XP, equipment, and current move pool.

### High Score Persistence
Run history and high scores are persisted to `localStorage`. The start screen displays the current local high score.

---

## Use Examples

1. **Starting a Run**: Select a player name on the start screen, then choose one of three starter Pokémon presented as TCGDex trading cards. This initializes floor 1 and spawns the first opponent.

2. **Turn-Based Combat**: Select a move from the bottom panel. Move buttons glow green for super effective matchups and dim for resisted ones. Each action triggers attack animations, damage calculations, and combat log entries. Status conditions and critical hits are called out inline.

3. **Floor Completion**: After defeating an enemy, a loot overlay presents up to 3 reward cards — a guaranteed heal, a possible held item, and stat upgrades. Selecting a reward advances to the next floor.

4. **Dungeon Mutations**: Every 5th floor the arena visually transforms and a weather mechanic activates, boosting certain move types or adding passive dodge.

5. **Scaling Difficulty**: Mini-boss encounters appear every 5 floors with boosted stats and smarter AI. Every 10th floor is a legendary Boss with dramatically increased bulk and full smart AI targeting.

6. **Move Management**: When a move scroll drops and all 4 move slots are full, a replacement overlay appears. Choose which move to forget or keep the current set and discard the new move.

---

## Project Status

The project is currently in a **Functional Prototype** state. The core game loop — including battle logic, stat scaling, the upgrade system, status effects, and equipment — is fully implemented and stable. The backend is a minimal Express server retained for potential future use but not required to play.

---

## Sources

- **Pokémon Data**: [PokeAPI](https://pokeapi.co/) — live entity data, movesets, type charts, and sprites.
- **Card Data**: [TCGDex](https://tcgdex.net/) — starter selection card assets.
- **Inspiration**:
  - Classic GBA Pokémon aesthetics mixed with *Sword Art Online* dashboard designs.
  - Fan-made Pokémon games: [PokéRogue](https://pokerogue.net/) and [PokéPlunder](https://khydra98.itch.io/pokeplunder).
