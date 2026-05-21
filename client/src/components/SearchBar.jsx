import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { usePitchExtraction } from '../hooks/usePitchExtraction';
import { runAnalysisPipeline } from '../utils/analysisPipeline';

export default function SearchBar() {
  const navigate = useNavigate();
  const { extractPitch } = usePitchExtraction();

  const [loading, setLoading] = useState(false);
  const song = useAppStore(state => state.song);
  const artist = useAppStore(state => state.artist);
  const setSong = useAppStore(state => state.setSong);
  const setArtist = useAppStore(state => state.setArtist);
  const setError = useAppStore(state => state.setError);
  const queue = useAppStore(state => state.queue);
  const addToQueue = useAppStore(state => state.addToQueue);
  const removeFromQueue = useAppStore(state => state.removeFromQueue);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!song) return;
    runAnalysisPipeline({ navigate, extractPitch });
  };

  const handleQueueAdd = (e) => {
    e.preventDefault();
    if (!song) return;
    addToQueue(song, artist);
    setSong('');
    setArtist('');
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Inputs row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', paddingLeft: 4 }}>Song</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <svg
                width="16" height="16" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                viewBox="0 0 24 24"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="search-song"
                type="text"
                placeholder="Song Title (e.g. Kesariya)"
                className="kara-input"
                style={{ paddingLeft: 38, width: '100%' }}
                value={song}
                onChange={e => {
                  const val = e.target.value;
                  const separator = val.includes(' - ') ? ' - ' 
                                  : val.includes(' — ') ? ' — ' 
                                  : val.includes(' | ') ? ' | ' 
                                  : null;

                  if (separator && !artist) {
                    const parts = val.split(separator);
                    setSong(parts[0].trim());
                    setArtist(parts.slice(1).join(separator).trim());
                  } else {
                    setSong(val);
                  }
                }}
                required
                autoComplete="off"
              />
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', paddingLeft: 4 }}>Artist</label>
            <input
              id="search-artist"
              type="text"
              placeholder="Singer / Artist (e.g. Arijit Singh)"
              className="kara-input"
              style={{ width: '100%' }}
              value={artist}
              onChange={e => setArtist(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Button row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="search-submit"
            type="submit"
            disabled={loading || !song}
            className="btn-cta"
            style={{
              flex: 1,
              justifyContent: 'center',
              opacity: (!song || loading) ? 0.5 : 1,
              cursor: (!song || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 16, height: 16, border: '2px solid #F5F0E840', borderTopColor: '#F5F0E8',
                    borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }}
                />
                Analyzing…
              </>
            ) : (
              <>Extract & Analyze →</>
            )}
          </button>
        </div>
      </form>

      {/* Queue list */}
      {queue.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
            Up next
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {queue.map((item, idx) => (
              <li key={idx} className="queue-card">
                <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>
                  {item.song}
                  {item.artist && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— {item.artist}</span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      setSong(item.song);
                      setArtist(item.artist);
                      runAnalysisPipeline({ navigate, extractPitch });
                      removeFromQueue(idx);
                    }}
                    style={{
                      background: 'var(--surface)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '4px 12px',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Play
                  </button>
                  <button
                    onClick={() => removeFromQueue(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: '4px 6px',
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
