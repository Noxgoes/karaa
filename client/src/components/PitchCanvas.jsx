import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { calculateYPercents, generateBezierPath } from '../utils/renderUtils';
import { getAudioContext } from '../hooks/useAudioPlayer';
import { useAudioControls } from '../context/AudioPlayerContext';
import { useAutoscroll } from '../hooks/useAutoscroll';
import AutoscrollBar from './AutoscrollBar';

export default function PitchCanvas() {
  const alignedLyrics = useAppStore(state => state.alignedLyrics);
  const syncOffsetMs = useAppStore(state => state.syncOffsetMs);
  const pitchHistory = useAppStore(state => state.pitchHistory);
  const isMicActive = useAppStore(state => state.isMicActive);
  const isAnalyzing = useAppStore(state => state.isAnalyzing);
  const isFullscreen = useAppStore(state => state.isFullscreen);
  const isRomanized = useAppStore(state => state.isRomanized);
  const isPlaying = useAppStore(state => state.isPlaying);
  const audioBuffer = useAppStore(state => state.audioBuffer);
  const lastSeekTime = useAppStore(state => state.lastSeekTime);
  const playbackRate = useAppStore(state => state.playbackRate);
  const scrollRef = useRef(null);
  const { isScrolling, speed, setSpeed, toggle, reset } = useAutoscroll(scrollRef, isPlaying);

  // ── Mirror play/pause into local refs for RAF loop ──
  const isPlayingRef = useRef(isPlaying);
  const playbackRateRef = useRef(playbackRate);
  const { seek } = useAudioControls();

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  // ── Read time directly from AudioContext via RAF ──
  const [currentMs, setCurrentMs] = useState(0);
  const [manualLine, setManualLine] = useState(null); // NULL = auto, index = locked line

  // ── Reset manual focus when song changes ──
  useEffect(() => {
    setManualLine(null);
  }, [alignedLyrics]);

  const rafRef = useRef(null);
  const startCtxTime = useRef(0);   // ctx.currentTime when play() was called
  const pauseOffset = useRef(0);   // song-seconds accumulated before this play segment

  // Listen for seek events from the player
  useEffect(() => {
    pauseOffset.current = lastSeekTime;
    if (isPlayingRef.current) {
      const ctx = getAudioContext();
      startCtxTime.current = ctx.currentTime;
    }
    setCurrentMs(lastSeekTime * 1000 + syncOffsetMs);
  }, [lastSeekTime, syncOffsetMs]);

  // When the player starts, capture the AudioContext start time
  useEffect(() => {
    if (isPlaying) {
      const ctx = getAudioContext();
      startCtxTime.current = ctx.currentTime;
      // pauseOffset stays from wherever we paused
    } else {
      // On pause, record accumulated position
      if (startCtxTime.current > 0) {
        const ctx = getAudioContext();
        pauseOffset.current += (ctx.currentTime - startCtxTime.current) * playbackRateRef.current;
        startCtxTime.current = 0;
      }
    }
  }, [isPlaying]);

  // Reset when a new audio buffer is loaded
  useEffect(() => {
    pauseOffset.current = 0;
    startCtxTime.current = 0;
    setCurrentMs(0);
  }, [audioBuffer]);

  // The RAF loop — runs every frame, computes fresh time, sets state
  useEffect(() => {
    const tick = () => {
      const ctx = getAudioContext();
      const elapsed = (isPlayingRef.current && startCtxTime.current > 0)
        ? (ctx.currentTime - startCtxTime.current) * playbackRateRef.current
        : 0;

      // ── ZERO-SNAP LOGIC ──
      // If the offset is very close to zero, force it to zero to avoid "sticky" drift
      const effectiveOffset = Math.abs(syncOffsetMs) < 10 ? 0 : syncOffsetMs;

      const songSec = pauseOffset.current + elapsed;
      setCurrentMs(Math.max(0, songSec * 1000) + effectiveOffset);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [syncOffsetMs]); // Re-run ensures instant snap on sync change

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const rowHeight = isMobile ? 180 : 300;
  const padding = isMobile ? 20 : 35;
  const hPad = isMobile ? 40 : 180;
  const svgWidth = isMobile ? 640 : 1200;
  const wordFontSize = isMobile ? '19' : '24';
  const wordFontWeight = isMobile ? '700' : '800';

  const MIN_WORD_SPACING = 160;

  // ── Build per-line layout data ─────────────────────────────────────────────
  const { linesData, minMidi, maxMidi } = useMemo(() => {
    if (!alignedLyrics || alignedLyrics.length === 0)
      return { linesData: [], minMidi: 0, maxMidi: 100 };

    const normalizedLyrics = calculateYPercents(alignedLyrics);
    const midis = alignedLyrics.map(w => w.midiNote);
    const _minMidi = Math.min(...midis);
    const _maxMidi = Math.max(...midis);

    const lineMap = {};
    normalizedLyrics.forEach(w => {
      if (!lineMap[w.lineIndex]) lineMap[w.lineIndex] = [];
      lineMap[w.lineIndex].push(w);
    });

    const sortedLineKeys = Object.keys(lineMap).sort((a, b) => Number(a) - Number(b));

    const _linesData = sortedLineKeys.map((lineIndex, idx) => {
      const words = lineMap[lineIndex];
      const positionedWords = words.map((w, i) => {
        // Distribute X evenly between hPad and svgWidth - hPad
        const x = words.length > 1
          ? hPad + (i / (words.length - 1)) * (svgWidth - hPad * 2)
          : svgWidth / 2; // Center if only one word
        const usableHeight = rowHeight - padding * 2;
        // Adjusted to 1.8 for highly prominent, dramatic vertical pitch contours
        const sensitiveYPercent = 50 + (w.yPercent - 50) * 1.8;
        const y = padding + (Math.min(Math.max(sensitiveYPercent, 0), 100) / 100) * usableHeight;
        return { ...w, x, y };
      });

      const pathData = generateBezierPath(positionedWords);
      const lineStartMs = positionedWords[0].startMs;
      const lineEndMs = positionedWords[positionedWords.length - 1].endMs;

      return { lineIndex, yOffset: idx * rowHeight, words: positionedWords, pathData, startMs: lineStartMs, endMs: lineEndMs };
    });

    return { linesData: _linesData, minMidi: _minMidi, maxMidi: _maxMidi };
  }, [alignedLyrics, rowHeight, padding, hPad, svgWidth]);



  // ── FIX 4: Correct gap fallback ───────────────────────────────────────────
  // During a gap between lines, highlight the LAST completed line (not the next one).
  // Old code: linesData.find(l => currentMs < l.endMs)  ← wrong: picks NEXT line early
  // New code: linesData.findLast(l => currentMs >= l.endMs) ← picks last seen line
  const autoLine =
    linesData.find(l => currentMs >= l.startMs && currentMs < l.endMs) ??
    (currentMs > 0 ? [...linesData].reverse().find(l => currentMs >= l.endMs) : null);

  const activeLine = manualLine !== null
    ? (linesData.find(l => Number(l.lineIndex) === manualLine) || autoLine)
    : autoLine;

  const totalHeight = Math.max(600, linesData.length * rowHeight + padding);

  // ── Auto-scroll: keep active line centred ─────────────────────────────────
  useEffect(() => {
    if (isScrolling) return; // Don't fight the continuous autoscroller
    if (!scrollRef.current || !activeLine) return;
    const container = scrollRef.current;
    const viewportH = container.clientHeight;
    const viewportW = container.clientWidth;

    // Scale factor: how much the SVG is stretched/shrunk relative to our base width
    const scale = viewportW / svgWidth;

    // Calculate target in screen pixels
    const lineCenterSvg = Number(activeLine.yOffset) + rowHeight / 2;
    const scrollTarget = (lineCenterSvg * scale) - (viewportH / 2);

    container.scrollTo({
      top: Math.max(0, scrollTarget),
      behavior: manualLine !== null ? 'instant' : 'smooth' // Snappier when manually clicking
    });
  }, [activeLine?.lineIndex, manualLine, isScrolling, svgWidth, rowHeight]);

  // ── Mic overlay helpers ───────────────────────────────────────────────────
  const getCoordinates = (timeMs, midi) => {
    const line = linesData.find(l => timeMs >= l.startMs - 2000 && timeMs <= l.endMs + 2000);
    if (!line) return null;
    const lineDuration = line.endMs - line.startMs;
    const progress = Math.max(0, Math.min(1, (timeMs - line.startMs) / Math.max(1, lineDuration)));
    const x = hPad + progress * (svgWidth - hPad * 2);
    const pitchRange = Math.max(1, maxMidi - minMidi);
    const yPercent = (maxMidi - midi) / pitchRange;
    const sensitiveYPercent = 0.5 + (yPercent - 0.5) * 1.8;
    const usableHeight = rowHeight - padding * 2;
    const y = padding + Math.min(Math.max(sensitiveYPercent, 0), 1) * usableHeight;
    return { x, y: y + line.yOffset, rawY: y, lineOffset: line.yOffset };
  };

  let micPathByLine = {};
  if (isMicActive && pitchHistory.length > 0) {
    pitchHistory.forEach(ph => {
      const coords = getCoordinates(ph.time * 1000, ph.midi);
      if (coords) {
        if (!micPathByLine[coords.lineOffset]) micPathByLine[coords.lineOffset] = [];
        micPathByLine[coords.lineOffset].push(coords);
      }
    });
  }

  // ── Export SVG ────────────────────────────────────────────────────────────
  const handleExportSVG = () => {
    const svgElement = document.getElementById('pitch-canvas-svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'pitch-map.svg';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (isAnalyzing) {
    return <LyricsSkeleton />;
  }

  if (!alignedLyrics || alignedLyrics.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 500 }}>No lyrics found for this song.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          overflowY: 'auto',
          background: 'var(--bg)',
          borderRadius: isFullscreen ? '0px' : 'var(--radius-lg)',
          border: isFullscreen ? 'none' : '0.5px solid var(--border-light)',
          marginTop: isFullscreen ? 0 : 8,
          position: 'relative',
          maxHeight: isFullscreen ? '100vh' : 'calc(100vh - 180px)',
          scrollBehavior: isScrolling ? 'auto' : 'smooth'
        }}
        className="group"
      >
        <AutoscrollBar
          isScrolling={isScrolling}
          speed={speed}
          setSpeed={setSpeed}
          toggle={toggle}
          reset={reset}
        />

      <button
        onClick={handleExportSVG}
        style={{
          position: 'absolute', top: 48, right: 16,
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-pill)', padding: '6px 14px',
          fontSize: 12, fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          zIndex: 10, opacity: 0, transition: 'opacity 0.2s',
        }}
        className="group-hover:opacity-100"
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export Pitch Map
      </button>

      <svg
        id="pitch-canvas-svg"
        width="100%"
        height="auto"
        viewBox={`0 0 ${svgWidth} ${totalHeight}`}
        style={{ display: 'block', background: 'var(--bg)' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" />
          </marker>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {linesData.map(line => {
          const isLineActive = activeLine && Number(activeLine.lineIndex) === Number(line.lineIndex);
          const isLinePast = activeLine
            ? Number(line.lineIndex) < Number(activeLine.lineIndex)
            : currentMs > line.endMs;

          return (
            <g key={`line-${line.lineIndex}`} transform={`translate(0, ${line.yOffset})`}>

              {/* ── Invisible hit-area for the entire line ── */}
              <rect
                x={0} y={0} width={svgWidth} height={rowHeight}
                fill="white"
                opacity="0"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setManualLine(Number(line.lineIndex));
                }}
              />

              {/* ── Mic overlay ── */}
              {isMicActive && micPathByLine[line.yOffset] && micPathByLine[line.yOffset].length > 1 && (
                <path
                  d={`M ${micPathByLine[line.yOffset].map(p => `${p.x},${p.rawY}`).join(' L ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.6"
                  filter="url(#glow)"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* ── Straight Arrow Segments connecting words ── */}
              {line.words.length > 1 && line.words.map((w, idx) => {
                if (idx === line.words.length - 1) return null;
                const next = line.words[idx + 1];

                const dx = next.x - w.x;
                const dy = next.y - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const displayWord = isRomanized && w.romanizedWord ? w.romanizedWord : w.word;
                const nextDisplayWord = isRomanized && next.romanizedWord ? next.romanizedWord : next.word;

                // Dynamically offset start/end so arrows don't overlap typography.
                // Standard offset works perfectly with word character length.
                const startOffset = Math.max(32, displayWord.length * 9 + 14);
                const endOffset = Math.max(28, nextDisplayWord.length * 9 + 10);

                let xStart = w.x;
                let yStart = w.y;
                let xEnd = next.x;
                let yEnd = next.y;

                if (dist > startOffset + endOffset) {
                  const ux = dx / dist;
                  const uy = dy / dist;
                  xStart = w.x + ux * startOffset;
                  yStart = w.y + uy * startOffset;
                  xEnd = next.x - ux * endOffset;
                  yEnd = next.y - uy * endOffset;
                } else {
                  xStart = w.x + dx * 0.25;
                  yStart = w.y + dy * 0.25;
                  xEnd = next.x - dx * 0.25;
                  yEnd = next.y - dy * 0.25;
                }

                const isArrowActive = currentMs >= w.startMs && currentMs < next.endMs;

                return (
                  <line
                    key={`arrow-${w.wordIndex}-${next.wordIndex}`}
                    x1={xStart}
                    y1={yStart}
                    x2={xEnd}
                    y2={yEnd}
                    stroke={isArrowActive ? "var(--text-primary)" : "var(--text-muted)"}
                    strokeWidth={isArrowActive ? "1.8" : "1.2"}
                    markerEnd="url(#arrowhead)"
                    style={{
                      opacity: isArrowActive ? 0.8 : 0.28,
                      transition: 'all 0.3s ease',
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

              {/* ── Words ── */}
              {line.words.map((w, i) => {
                const isPast = currentMs > w.endMs;
                const isActive = currentMs >= w.startMs && currentMs < w.endMs;
                const isFuture = currentMs < w.startMs;

                let textColor = 'var(--text-muted)';
                let scale = 1;
                let opacity = 0.5;
                let blur = '0px';

                if (isActive) {
                  textColor = 'var(--text-active)';
                  scale = 1.08;
                  opacity = 1;
                }

                const fontSize = wordFontSize;
                const fontWeight = isActive ? '800' : '600';

                let rotation = 0;
                if (i < line.words.length - 1) {
                  const next = line.words[i + 1];
                  rotation = Math.atan2(next.y - w.y, next.x - w.x) * (180 / Math.PI) * 0.3;
                } else if (i > 0) {
                  const prev = line.words[i - 1];
                  rotation = Math.atan2(w.y - prev.y, w.x - prev.x) * (180 / Math.PI) * 0.3;
                }

                return (
                  <g
                    key={`word-${w.wordIndex}`}
                    transform={`translate(${w.x}, ${w.y}) rotate(${rotation}) scale(${scale})`}
                    style={{
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      pointerEvents: 'none'
                    }}
                  >
                    <g
                      style={{
                        animation: `fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                        animationDelay: `${Math.min(2, w.wordIndex * 0.05)}s`,
                        opacity,
                      }}
                    >
                      <text
                        x="0" y="0"
                        textAnchor={i === 0 ? 'start' : i === line.words.length - 1 ? 'end' : 'middle'}
                        dominantBaseline="middle"
                        fill={textColor}
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        fontFamily="'Inter', sans-serif"
                        style={{
                          transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          filter: isActive ? 'url(#activeGlow)' : `blur(${blur})`,
                          userSelect: 'none',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {isRomanized && w.romanizedWord ? w.romanizedWord : w.word}
                      </text>
                    </g>
                  </g>
                );
              })}

            </g>
          );
        })}
      </svg>

      </div>

      {/* ── Manual Focus Override Reset (Autoscroll Button) ── */}
      {manualLine !== null && (
        <button
          id="reset-manual-focus"
          onClick={(e) => {
            e.stopPropagation();
            setManualLine(null);
          }}
          style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            background: 'var(--player-text, #F5F0E8)',
            color: 'var(--player-bg, #1A1817)',
            border: 'none',
            borderRadius: 'var(--radius-pill, 30px)',
            padding: '12px 24px',
            fontSize: '12px',
            fontWeight: 800,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            backdropFilter: 'blur(8px)',
          }}
          title="Resume automatic scrolling"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 13 12 18 17 13"></polyline>
            <polyline points="7 6 12 11 17 6"></polyline>
          </svg>
          <span>Resume Autoscroll</span>
          <span style={{ fontSize: 16, opacity: 0.5, marginLeft: 4 }}>✕</span>
        </button>
      )}
    </div>

  );
}

function LyricsSkeleton() {
  const lines = [5, 4, 6, 3, 5];
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
      padding: '60px 20px',
      minHeight: '50vh',
    }}>
      {lines.map((count, li) => (
        <div key={li} style={{ display: 'flex', gap: 16 }}>
          {Array.from({ length: count }).map((_, wi) => (
            <div
              key={wi}
              style={{
                width: 40 + Math.random() * 60,
                height: 24,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--surface)',
                border: '0.5px solid var(--border-light)',
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${li * 0.1 + wi * 0.05}s`,
              }}
            />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
