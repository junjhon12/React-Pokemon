import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { OAuth2Client } from 'google-auth-library'; // <-- NEW

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize the Google Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json()); 

// ==========================================
// 1. MONGOOSE SCHEMA (Now with Google ID)
// ==========================================
const leaderboardSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true }, // The permanent anchor
  name: { type: String, required: true },
  pokemon: { type: String, required: true },
  pokemonId: { type: Number, required: true },
  floor: { type: Number, required: true },
  date: { type: Date, default: Date.now } 
});

// Using a new collection name to start fresh with secure data
const Score = mongoose.model('VerifiedScore', leaderboardSchema);

// ==========================================
// 2. API ROUTES 
// ==========================================

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topScores = await Score.find().sort({ floor: -1 }).limit(10);
    res.json(topScores);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/api/leaderboard', async (req, res) => {
  try {
    // 1. Grab the token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];

    // 2. Cryptographically verify the token with Google's servers
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    // 3. Extract the guaranteed true identity of the user
    const payload = ticket.getPayload();
    const googleId = payload.sub; 
    const verifiedName = payload.name.replace(/\s+/g, '').slice(0, 15);

    const { pokemon, pokemonId, floor } = req.body;
    
    // 4. Upsert logic using their permanent Google ID
    const existingPlayer = await Score.findOne({ googleId });

    if (existingPlayer) {
      if (floor > existingPlayer.floor) {
        existingPlayer.floor = floor;
        existingPlayer.pokemon = pokemon;
        existingPlayer.pokemonId = pokemonId;
        existingPlayer.name = verifiedName; // Update their name just in case they changed it on Google
        existingPlayer.date = Date.now();
        await existingPlayer.save();
        return res.status(200).json({ message: 'High score updated!', score: existingPlayer });
      } else {
        return res.status(200).json({ message: 'Run finished, but did not beat previous high score.', score: existingPlayer });
      }
    } else {
      const newScore = new Score({ googleId, name: verifiedName, pokemon, pokemonId, floor });
      await newScore.save();
      return res.status(201).json({ message: 'New player registered and score saved!', score: newScore });
    }
  } catch (error) {
    console.error("Error saving secure score:", error);
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
});

// ==========================================
// 3. DATABASE CONNECTION
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