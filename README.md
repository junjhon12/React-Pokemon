# Poké-Rogue 👾

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

**[🎮 Play the Live Demo Here]** *(Insert your Vercel/Netlify link here)*

![Gameplay Demo](./public/demo.gif) *(Capture a 10-second GIF of the battle loop and put it in your public folder)*

## 📖 Overview
Poké-Rogue is a browser-based, infinite-progression roguelike built entirely in React. Rather than a simple CRUD application, this project serves as a demonstration of **complex state-machine management**, **asynchronous data resolution**, and **dynamic UI rendering**.

The game hooks into the external [PokeAPI](https://pokeapi.co/), fetching live entity data, resolving nested endpoints (like movesets and status effects) in parallel, and mapping them into a strictly typed battle engine.

## ✨ Core Engineering Features

### ⚙️ Asynchronous Battle Engine
The core game loop is driven by a custom state machine leveraging React hooks (`useState`, `useEffect`). 
* **Turn Resolution:** Handles initiative (Speed-based), accuracy checks, type-effectiveness multipliers, and defensive mitigation.
* **Animation Sequencing:** Utilizes nested `setTimeout` operations combined with CSS keyframes to delay state mutations, ensuring attack animations, damage calculation, and health-bar reduction occur in a visually satisfying, synchronous sequence without blocking the main thread.

### 🔌 Dynamic Data Normalization
Raw JSON from the PokeAPI is massive and deeply nested. 
* **Data Mapping:** Transforms raw API payloads into lean, strictly-typed TypeScript interfaces (`Pokemon`, `Move`, `Upgrade`).
* **Parallel Fetching:** Employs `Promise.all()` to resolve an array of random movesets concurrently before finalizing the character's generation, optimizing load times between dungeon floors.

### 📈 Roguelike Progression Architecture
Built to scale infinitely, the game relies on mathematical algorithms rather than hardcoded levels.
* **Stat Scaling:** Enemy stats scale dynamically based on the current floor (`Floor * 0.1` multiplier), with forced legendary "Boss" encounters every 10 floors.
* **Dynamic Loot Pools:** The loot generator checks the player's current ID against an `EVOLUTION_MAP` dictionary. Evolution stones are injected into the loot pool *only* if a valid evolution path exists.
* **RPG Mechanics:** Implements Experience (XP) overflow calculations, level-up stat growth, and complex RNG stats like Critical Hit Chance and Dodge Rate.

### 🎨 Retro-SciFi UI Design
The interface blends classic GBA-era aesthetics with a sleek, modern dashboard inspired by *Sword Art Online*.
* **Responsive Layouts:** Built with utility-first Tailwind CSS, utilizing complex Flexbox and CSS Grid structures to create a split-pane dashboard.
* **CSS Wizardry:** Uses CSS filters (`brightness-0`, `opacity`) to dynamically convert standard API sprites into holographic silhouettes for the equipment menu.

## 🧠 Architecture & Technical Decisions

* **Scalable State Models:** Stats are stored in a nested `Record<StatKey, number>` object. This allows upgrades to dynamically target any stat (e.g., `newStats[targetStat] += upgrade.amount`) without requiring massive `switch` statements, making the codebase highly extensible.
* **Separation of Concerns:** Business logic (damage math, effectiveness matrices, loot generation) is decoupled from the UI layer and stored in `src/utils/gameLogic.ts`.
* **Status Effect Loop:** Engineered a pre-attack and post-attack check system. 'Paralyze' has a 25% chance to halt the `handleMoveClick` execution entirely, while 'Burn' triggers a specific 10% max HP deduction at the tail-end of the `useEffect` turn timer.

## 🚀 Local Development

To run this project locally, you will need Node.js installed.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/pokemon-rogue.git](https://github.com/yourusername/pokemon-rogue.git)
