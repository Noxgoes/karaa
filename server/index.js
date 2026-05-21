import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import lyricsRouter from './routes/lyrics.js';
import audioRouter from './routes/audio.js';
import rateLimiter from './middleware/rateLimit.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Metadata proxy (iTunes)
app.get('/api/metadata', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song,album&limit=1`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// Routes
app.use('/api/lyrics', lyricsRouter);
app.use('/api/audio', audioRouter);
app.use('/api/transcribe', (await import('./routes/transcribe.js')).default);

// Serve static files from React build directory
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// For any other request, send back React's index.html (SPA client-side routing fallback)
app.get('*', (req, res, next) => {
  // If it's an API route, let it pass to standard express handling
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist (e.g. in dev), return 404
      res.status(404).send('Not Found');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
