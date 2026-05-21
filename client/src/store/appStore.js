import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  song: '',
  artist: '',
  lyrics: [], // The word array for the current song
  alignedLyrics: [], // Currently active aligned array
  isAnalyzing: false,
  showPlayer: false,
  analysisStep: '',
  syncedLyrics: null,
  albumArt: null,
  error: null,
  
  // Queue / Playlist
  queue: [], // Array of { song, artist }
  
  // Playback state
  audioBuffer: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  syncOffsetMs: 0, // user-adjustable lyric sync nudge (±ms)
  lastSeekTime: 0, // triggered whenever user seek/rewind happens

  // Mic & Modal state
  isMicActive: false,
  isHowToOpen: false,
  micPitch: 0,
  micMidi: 0,
  pitchHistory: [], // array of { time, midi }
  accuracyScore: null,
  isFullscreen: false,
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  isRomanized: false,
  toggleRomanized: () => set(state => ({ isRomanized: !state.isRomanized })),
  
  // Audio source state for Studio upload/youtube
  audioSourceTab: 'upload',
  audioFile: null,
  youtubeUrl: '',
  isFetchingYt: false,
  presetPath: '',
  setAudioSourceTab: (audioSourceTab) => set({ audioSourceTab }),
  setAudioFile: (audioFile) => set({ audioFile }),
  setYoutubeUrl: (youtubeUrl) => set({ youtubeUrl }),
  setIsFetchingYt: (isFetchingYt) => set({ isFetchingYt }),
  
  setIsHowToOpen: (isHowToOpen) => set({ isHowToOpen }),
  addToQueue: (song, artist) => set(state => ({ queue: [...state.queue, { song, artist }] })),
  removeFromQueue: (index) => set(state => ({ queue: state.queue.filter((_, i) => i !== index) })),
  
  setSongInfo: (song, artist) => set({ song, artist }),
  setSong: (song) => set({ song }),
  setArtist: (artist) => set({ artist }),

  setLyrics: (data) => {
    if (!data) return;
    
    // Reset syncedLyrics to null by default
    set({ syncedLyrics: null });
    
    const lyricsData = data.lyrics || data;
    const synced = data.syncedLyrics || null;

    // We assume data.lyrics is an object { original: [...] } or just an array
    const words = Array.isArray(lyricsData) ? lyricsData : (lyricsData.original || []);

    set({ 
      lyrics: words,
      alignedLyrics: [],
      syncedLyrics: synced,
      artist: data.officialArtist || get().artist,
      song: data.officialTitle || get().song
    });
  },

  setAlignedLyrics: (alignedLyrics) => set({ alignedLyrics }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setShowPlayer: (showPlayer) => set({ showPlayer }),
  setAnalysisStep: (analysisStep) => set({ analysisStep }),
  setError: (error) => set({ error }),
  setAlbumArt: (albumArt) => set({ albumArt }),
  
  setAudioBuffer: (audioBuffer) => set({ audioBuffer }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setSyncOffsetMs: (syncOffsetMs) => set({ syncOffsetMs }),
  setLastSeekTime: (lastSeekTime) => set({ lastSeekTime }),
  
  setIsMicActive: (isMicActive) => set({ isMicActive }),
  setMicPitchData: (pitch, midi, time) => set((state) => ({
    micPitch: pitch,
    micMidi: midi,
    pitchHistory: [...state.pitchHistory, { time, midi }].slice(-200) // Keep last 200 frames
  })),
  clearPitchHistory: () => set({ pitchHistory: [] }),
  setAccuracyScore: (accuracyScore) => set({ accuracyScore })
}));
