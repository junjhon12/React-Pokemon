Poké-Rogue 👾
Browser-Based Infinite Roguelike Engine
5️⃣ Table of Contents
Introduction

Technologies Used

Launch & Local Development

Illustrations

Scope of Functions

Use Examples

Project Status

Sources

2️⃣ Introduction of the Project Aim
Poké-Rogue is a technical demonstration of a browser-based, infinite-progression roguelike built using modern web standards. The project’s primary objective is to showcase:

Complex State-Machine Management: Orchestrating a multi-stage battle loop and progression system.

Asynchronous Data Resolution: Fetching and normalizing live data from external APIs in parallel to ensure a seamless user experience.

Dynamic UI Rendering: Creating a responsive, data-driven dashboard that scales with player progression.

3️⃣ Technologies Used
The project utilizes a high-performance, modern tech stack:

Core: React 19, TypeScript

State Management: Zustand (for global game state)

Styling: Tailwind CSS 4, PostCSS, Autoprefixer

Build Tool: Vite

Backend & Auth: Supabase, MongoDB, Google OAuth (@react-oauth/google)

SDKs: TCGDex SDK (for card-based data)

4️⃣ Launch
🌐 Live Demo
You can play the live version here: Poké-Rogue Live Demo

💻 Local Setup
To run this project locally, ensure you have Node.js installed:

Clone the repository:

Bash
git clone https://github.com/junjhon12/React-Pokemon.git
Install dependencies:

Bash
npm install
Run in development mode:

Bash
npm run dev
6️⃣ Illustrations
🛡️ Tech Stack Badges
🎮 Gameplay Demo
7️⃣ Scope of Functions
Asynchronous Battle Engine: A turn-based system handling Speed-based initiative, accuracy checks, and type-effectiveness multipliers.

Infinite Progression Architecture: Enemy stats scale dynamically based on the current floor (Floor * 0.1 multiplier).

Dynamic Loot & Upgrade System: Players choose from randomly generated upgrades or equipment after every victory.

Evolution System: Implements a dictionary-based EVOLUTION_MAP that triggers evolution sequences when specific items are selected.

Status Effect Engine: Pre-attack and post-attack checks for conditions like 'Paralyze', 'Burn', and 'Freeze'.

High Score Persistence: Persists progress and high scores using localStorage.

8️⃣ Use Examples
Starting a Run: Upon launching, the user selects a starter Pokémon which initializes the first floor and spawns a random opponent.

Turn-Based Combat: The player selects moves (e.g., Tackle) which trigger animations (e.g., animate-lunge-right) and damage calculations.

Floor Completion: After defeating an enemy, the user is presented with three upgrade cards—ranging from stat boosts (HP, Attack) to rare equipment held-items.

Scaling Difficulty: Every 5 floors features a "Mini-Boss" with boosted stats, while every 10 floors triggers a legendary "Boss" encounter.

9️⃣ Project Status
The project is currently in a Functional Prototype state. The core game loop—including battle logic, stat scaling, and the upgrade system—is fully implemented and stable. Future updates may include expansion of starter pokemon.

🔟 Sources
Data Provider: PokeAPI – Used for live entity data, movesets, and sprites.

Card Data: TCGDex – Integration for additional card-based assets.

Inspiration: 
Classic GBA Pokemon aesthetics mixed with Sword Art Online dashboard designs.
Fan-made Pokemon games: PokemonRogue[https://pokerogue.net/] and PokePlunder[https://khydra98.itch.io/pokeplunder]