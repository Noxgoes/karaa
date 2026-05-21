import express from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { transliterate } from 'transliteration';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
    // Clean up uploaded file
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (_) {}
    
    console.error('[GROQ] Error: GROQ_API_KEY is not configured or is the default placeholder.');
    return res.status(400).json({ 
      error: 'GROQ_API_KEY is not configured on the server. Please open the ".env" file in the project root and replace "your_groq_api_key_here" with your actual Groq API key.' 
    });
  }

  const groq = new Groq({ apiKey: groqApiKey });
  let tempFilePath = null;

  try {
    // We need to rename the file to have a proper extension so Groq knows the format
    const originalExt = path.extname(req.file.originalname) || '.m4a';
    tempFilePath = `${req.file.path}${originalExt}`;
    fs.renameSync(req.file.path, tempFilePath);

    console.log(`[GROQ] Transcribing audio file: ${req.file.originalname} (${req.file.size} bytes)`);
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      language: "hi",
      response_format: "verbose_json",
      timestamp_granularities: ["word"]
    });

    // Clean up
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    console.log(`[GROQ] Transcription completed successfully. Applying local romanization...`);

    if (transcription.words && transcription.words.length > 0) {
      transcription.words.forEach(w => {
        w.romanizedWord = transliterate(w.word); 
      });
      console.log(`[GROQ] Local romanization applied successfully.`);
    }

    res.json(transcription);
  } catch (err) {
    console.error('Groq transcription error details:', err);
    
    // Attempt cleanup of both potential file paths
    try {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (_) {}
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (_) {}

    const errorMessage = err?.message || 'Failed to transcribe audio';
    res.status(500).json({ error: `Groq Transcription failed: ${errorMessage}` });
  }
});

export default router;
