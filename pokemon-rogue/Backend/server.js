import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); 

// ==========================================
// 1. MONGOOSE SCHEMA (The Blueprint)
// ==========================================
const leaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pokemon: { type: String, required: true },
  pokemonId: { type: Number, required: true },
  floor: { type: Number, required: true },
  date: { type: Date, default: Date.now } 
});

const Score = mongoose.model('Score', leaderboardSchema);


// ==========================================
// 2. API ROUTES (The Endpoints)
// ==========================================

// GET Route: Fetch the Top 10 High Scores
app.get('/api/leaderboard', async (req, res) => {
  try {
    const topScores = await Score.find().sort({ floor: -1 }).limit(10);
    res.json(topScores);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST Route: Submit or Update a High Score
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { name, pokemon, pokemonId, floor } = req.body;
    
    // Find the player by name. 
    const existingPlayer = await Score.findOne({ name });

    if (existingPlayer) {
      // If they exist, ONLY update if their new run is deeper than their old run
      if (floor > existingPlayer.floor) {
        existingPlayer.floor = floor;
        existingPlayer.pokemon = pokemon;
        existingPlayer.pokemonId = pokemonId;
        existingPlayer.date = Date.now();
        await existingPlayer.save();
        return res.status(200).json({ message: 'High score updated!', score: existingPlayer });
      } else {
        // They didn't beat their high score
        return res.status(200).json({ message: 'Run finished, but did not beat previous high score.', score: existingPlayer });
      }
    } else {
      // Player does not exist yet, create a new entry
      const newScore = new Score({ name, pokemon, pokemonId, floor });
      await newScore.save();
      return res.status(201).json({ message: 'New player registered and score saved!', score: newScore });
    }
  } catch (error) {
    console.error("Error saving score:", error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});


// ==========================================
// 3. DATABASE CONNECTION & SERVER START
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🔥 Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });