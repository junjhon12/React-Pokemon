# Poké-Rogue 👾
### Browser-Based Infinite Roguelike Engine

---

## 5️⃣ Table of Contents
1.  [Introduction](#2-introduction-of-the-project-aim)
2.  [Technologies Used](#3-technologies-used)
3.  [Launch & Local Development](#4-launch)
4.  [Illustrations](#6-illustrations)
5.  [Scope of Functions](#7-scope-of-functions)
6.  [Use Examples](#8-use-examples)
7.  [Project Status](#9-project-status)
8.  [Sources](#10-sources)

---

## 2️⃣ Introduction of the Project Aim
Poké-Rogue is a technical demonstration of a browser-based, infinite-progression roguelike built using modern web standards. The project’s primary objective is to showcase:
* **Complex State-Machine Management**: Orchestrating a multi-stage battle loop and progression system.
* **Asynchronous Data Resolution**: Fetching and normalizing live data from external APIs in parallel to ensure a seamless user experience.
* **Dynamic UI Rendering**: Creating a responsive, data-driven dashboard that scales with player progression.

---

## 3️⃣ Technologies Used
The project utilizes a high-performance, modern tech stack:
* **Core**: React 19, TypeScript
* **State Management**: Zustand (for global game state)
* **Styling**: Tailwind CSS 4, PostCSS, Autoprefixer
* **Build Tool**: Vite
* **Backend & Auth**: Supabase, MongoDB, Google OAuth (@react-oauth/google)
* **SDKs**: TCGDex SDK (for card-based data)

---

## 4️⃣ Launch
### 🌐 Live Demo
You can play the live version here: [Poké-Rogue Live Demo](https://69a5a72f18b9fa0008239684--pokemon-deep.netlify.app/)

### 💻 Local Setup
To run this project locally, ensure you have **Node.js** installed:
1.  **Clone the repository**:
    ```bash
    git clone [https://github.com/junjhon12/React-Pokemon.git](https://github.com/junjhon12/React-Pokemon.git)
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in development mode**:
    ```bash
    npm run dev
    ```

---

## 6️⃣ Illustrations
### 🛡️ Tech Stack Badges
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

### 🎮 Gameplay Demo
![Gameplay Demo](./public/demo.gif)

---

## 7️⃣ Scope of Functions
* **Asynchronous Battle Engine**: A turn-based system handling speed-based initiative, accuracy checks, and type-effectiveness multipliers.
* **Infinite Progression Architecture**: Enemy stats scale dynamically based on the current floor using a `Floor * 0.1` multiplier.
* **Dynamic Loot & Upgrade System**: Players choose from randomly generated upgrades or equipment after every victory.
* **Evolution System**: Implements a dictionary-based `EVOLUTION_MAP` that triggers evolution sequences when specific items or levels are reached.
* **Status Effect Engine**: Pre-attack and post-attack checks for conditions like 'Paralyze', 'Burn', and 'Freeze'.
* **High Score Persistence**: Persists progress and high scores using `localStorage`.

---

## 8️⃣ Use Examples
1.  **Starting a Run**: Upon launching, the user selects a starter Pokémon which initializes the first floor and spawns a random opponent.
2.  **Turn-Based Combat**: The player selects moves (e.g., Tackle) which trigger animations (e.g., `animate-lunge-right`) and damage calculations.
3.  **Floor Completion**: After defeating an enemy, the user is presented with three upgrade cards—ranging from stat boosts (HP, Attack) to rare equipment held-items.
4.  **Scaling Difficulty**: Every 5 floors features a "Mini-Boss" with boosted stats, while every 10 floors triggers a legendary "Boss" encounter.

---

## 9️⃣ Project Status
The project is currently in a **Functional Prototype** state. The core game loop—including battle logic, stat scaling, and the upgrade system—is fully implemented and stable. Future updates may include expanded starter Pokémon selection and additional backend features.

---

## 🔟 Sources
* **Data Provider**: [PokeAPI](https://pokeapi.co/) – Used for live entity data, movesets, and sprites.
* **Card Data**: [TCGDex](https://tcgdex.net/) – Integration for additional card-based assets.
* **Inspiration**: 
    * Classic GBA Pokémon aesthetics mixed with *Sword Art Online* dashboard designs.
    * Fan-made Pokémon games: [PokeRogue](https://pokerogue.net/) and [PokePlunder](https://khydra98.itch.io/pokeplunder).