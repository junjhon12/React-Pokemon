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

// POST Route: Submit a new High Score
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { name, pokemon, pokemonId, floor } = req.body;
    
    const newScore = new Score({ name, pokemon, pokemonId, floor });
    await newScore.save();
    
    res.status(201).json({ message: 'Score saved successfully!', score: newScore });
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