import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const leaderboardSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  pokemon:   { type: String, required: true },
  pokemonId: { type: Number, required: true },
  floor:     { type: Number, required: true },
  date:      { type: Date, default: Date.now },
});

const Score = mongoose.model('Score', leaderboardSchema);

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topScores = await Score.find().sort({ floor: -1 }).limit(10);
    res.json(topScores);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/api/leaderboard', async (req, res) => {
  try {
    const { name, pokemon, pokemonId, floor } = req.body;

    if (!name || !pokemon || !pokemonId || !floor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanName = name.replace(/\s+/g, '').slice(0, 15);

    // Find existing entry for this name and only update if it's a new high score
    const existing = await Score.findOne({ name: cleanName });

    if (existing) {
      if (floor > existing.floor) {
        existing.floor     = floor;
        existing.pokemon   = pokemon;
        existing.pokemonId = pokemonId;
        existing.date      = new Date();
        await existing.save();
        return res.status(200).json({ message: 'High score updated!', score: existing });
      }
      return res.status(200).json({ message: 'Run finished, but did not beat previous high score.', score: existing });
    }

    const newScore = new Score({ name: cleanName, pokemon, pokemonId, floor });
    await newScore.save();
    return res.status(201).json({ message: 'Score saved!', score: newScore });

  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

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