import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { addPitchToLyrics } from '../utils/alignUtils';

export function usePitchExtraction() {
  const [progress, setProgress] = useState(0);
  const setAlignedLyrics = useAppStore(state => state.setAlignedLyrics);
  const setIsAnalyzing = useAppStore(state => state.setIsAnalyzing);

  const extractPitch = async (audioBuffer) => {
    setIsAnalyzing(true);
    setProgress(0);

    try {
      // ── Step 1: Downmix to mono ──────────────────────────────────────────
      let mono;
      if (audioBuffer.numberOfChannels > 1) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        mono = new Float32Array(left.length);
        for (let i = 0; i < left.length; i++) mono[i] = (left[i] + right[i]) / 2;
      } else {
        mono = audioBuffer.getChannelData(0);
      }

      // ── Step 2: Pitch Detection (Basic Pitch) ────────────────────────────
      const sampleRate = audioBuffer.sampleRate;
      const notes = await mockPitchDetect(mono, sampleRate);

      // ── Step 3: ALIGNMENT ──────────────────────────────────────────────
      // Since we now use Whisper, we already have exact startMs/endMs for every word.
      // We just need to find the median pitch note during each word's time window.
      const { lyrics: whisperLyrics } = useAppStore.getState();
      const alignedLyrics = whisperLyrics ? addPitchToLyrics(whisperLyrics, notes) : [];

      // ── Step 5: COMMIT ──────────────────────────────────────────────────
      useAppStore.setState({
        alignedLyrics,
        isAnalyzing: false,
        analysisStep: 'complete'
      });

    } catch (err) {
      console.error('[PitchExtraction] Error:', err);
      useAppStore.setState({ isAnalyzing: false, error: err.message });
    }
  };

  return { extractPitch, progress };
}

async function mockPitchDetect(fullMono, fullSampleRate) {
  const targetRate = 11025;
  const ratio = Math.floor(fullSampleRate / targetRate);
  const mono = new Float32Array(Math.floor(fullMono.length / ratio));
  for (let i = 0; i < mono.length; i++) mono[i] = fullMono[i * ratio];
  const sampleRate = fullSampleRate / ratio;

  const notes = [];
  const frameSize = 512;
  const step = 512;
  const minDurationMs = 150;
  
  let current = null;
  const commitNote = (c, d) => ({
    startTimeSeconds: c.startTimeSeconds,
    durationSeconds: d,
    pitchHz: c.pitchHz,
    pitchMidi: c.pitchMidi,
    amplitude: 0.8
  });

  for (let i = 0; i < mono.length - frameSize; i += step) {
    const frame = mono.slice(i, i + frameSize);
    let maxVal = 0;
    for (let j = 0; j < frame.length; j++) if (Math.abs(frame[j]) > maxVal) maxVal = Math.abs(frame[j]);
    if (maxVal < 0.05) {
      if (current) {
        const dur = (i / sampleRate) - current.startTimeSeconds;
        if (dur * 1000 >= minDurationMs) notes.push(commitNote(current, dur));
        current = null;
      }
      continue;
    }

    const pitch = autoCorrelate(frame, sampleRate);
    if (pitch > 0) {
      const midi = hzToMidi(pitch);
      const time = i / sampleRate;
      if (!current) {
        current = { startTimeSeconds: time, pitchHz: pitch, pitchMidi: midi, samples: 1, midiSum: midi };
      } else {
        if (Math.abs(midi - Math.round(current.midiSum / current.samples)) <= 2) {
          current.samples++;
          current.midiSum += midi;
        } else {
          const dur = time - current.startTimeSeconds;
          if (dur * 1000 >= minDurationMs) notes.push(commitNote(current, dur));
          current = { startTimeSeconds: time, pitchHz: pitch, pitchMidi: midi, samples: 1, midiSum: midi };
        }
      }
    } else if (current) {
      const dur = (i / sampleRate) - current.startTimeSeconds;
      if (dur * 1000 >= minDurationMs) notes.push(commitNote(current, dur));
      current = null;
    }
  }
  return notes;
}

function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;
  let minOffset = Math.max(2, Math.floor(sampleRate / 1000));
  let maxOffset = Math.min(SIZE - 1, Math.floor(sampleRate / 50));
  
  let bestOffset = -1;
  let bestCorrelation = -1;

  for (let i = minOffset; i <= maxOffset; i++) {
    let correlation = 0;
    for (let j = 0; j < SIZE - i; j++) {
      correlation += buffer[j] * buffer[j + i];
    }
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = i;
    }
  }

  if (bestOffset === -1 || bestCorrelation < 0.1) return -1;
  return sampleRate / bestOffset;
}

function hzToMidi(hz) {
  return Math.round(12 * Math.log2(hz / 440) + 69);
}
