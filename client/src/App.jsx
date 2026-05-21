import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AudioUploader from './components/AudioUploader';
import PitchCanvas from './components/PitchCanvas';
import PlaybackControls from './components/PlaybackControls';
import SearchBar from './components/SearchBar';
import AnalysisLoadingScreen from './components/AnalysisLoadingScreen';
import { useAppStore } from './store/appStore';
import { useMicPitch } from './hooks/useMicPitch';
import { useAudioControls } from './context/AudioPlayerContext';
import HowToModal from './components/HowToModal';
import { runAnalysisPipeline } from './utils/analysisPipeline';
import { usePitchExtraction } from './hooks/usePitchExtraction';

// ── Album card data ────────────────────────────────────────────────────────
const ALBUM_CARDS = [
  { id: 'starboy', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg', w: 160, top: '7%', left: '4%', rot: -12, blur: 0, opacity: 1, float: 'a' },
  { id: 'ts1989', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/89/4a/4a/894a4ab9-b0b0-9ea5-ca41-8da0b9b79453/14UMDIM03405.rgb.jpg/600x600bb.jpg', w: 130, top: '12%', left: '17%', rot: 8, blur: 0, opacity: 1, float: 'b' },
  { id: 'divide', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/600x600bb.jpg', w: 155, top: '30%', left: '13%', rot: -6, blur: 0, opacity: 1, float: 'a' },
  { id: 'yjhd', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/62/d6/74/62d67432-0670-631f-db6a-d4bac3adae4b/8902894353328_cover.jpg/600x600bb.jpg', w: 120, top: '16%', left: '1%', rot: 14, blur: 1.5, opacity: 0.7, float: 'b' },
  { id: 'kabirsingh', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/f6/70/84/f6708434-0123-ff36-0ac3-7401e8cf0f94/8902894360807_cover.jpg/600x600bb.jpg', w: 125, top: '56%', left: '3%', rot: -10, blur: 0, opacity: 1, float: 'a' },
  { id: 'adele21', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/eb/ca/25/ebca2596-cd1e-b295-91a3-771c868d0a79/191404113868.png/600x600bb.jpg', w: 140, top: '73%', left: '1%', rot: 6, blur: 0, opacity: 1, float: 'b' },
  { id: 'okcomputer', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg', w: 130, top: '76%', left: '18%', rot: -8, blur: 0, opacity: 1, float: 'a' },
  { id: '3idiots', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/6e/99/7c/6e997cb1-1d80-3dc1-121d-53919ccace52/840214403941.png/600x600bb.jpg', w: 145, top: '6%', left: '54%', rot: 10, blur: 0, opacity: 1, float: 'b' },
  { id: 'rockstar', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/56/ac/41/56ac41f7-99f3-3eae-3b07-443167292c4e/8902894697408_cover.jpg/600x600bb.jpg', w: 130, top: '14%', left: '70%', rot: -14, blur: 0, opacity: 1, float: 'a' },
  { id: 'thriller', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/600x600bb.jpg', w: 105, top: '8%', left: '88%', rot: 12, blur: 1.5, opacity: 0.65, float: 'b' },
  { id: 'znmd', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b0/3f/4c/b03f4cca-8a6a-f506-4490-3263b4fb620c/8902894696296_cover.jpg/600x600bb.jpg', w: 120, top: '28%', left: '84%', rot: -8, blur: 0, opacity: 1, float: 'a' },
  { id: 'future', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e9/c5/a8/e9c5a8a0-d698-137b-2e85-cf3a8d9548f8/190295303372.jpg/600x600bb.jpg', w: 148, top: '48%', left: '76%', rot: 6, blur: 0, opacity: 1, float: 'b' },
  { id: 'gullyboy', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/3a/5e/60/3a5e6034-8755-f0bf-d4f0-c7f96d3b45bb/8718857674948.png/600x600bb.jpg', w: 140, top: '68%', left: '82%', rot: -10, blur: 0, opacity: 1, float: 'a' },
  { id: 'damn', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/ab/16/ef/ab16efe9-e7f1-66ec-021c-5592a23f0f9e/17UMGIM88793.rgb.jpg/600x600bb.jpg', w: 130, top: '70%', left: '67%', rot: 14, blur: 0, opacity: 1, float: 'b' },
  { id: 'abbey', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/600x600bb.jpg', w: 120, top: '82%', left: '35%', rot: 8, blur: 0, opacity: 1, float: 'b' },
  { id: 'dilse', src: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/8e/f8/85/8ef88544-a6c7-018b-0a75-dc3b6b024fa0/cover.jpg/600x600bb.jpg', w: 90, top: '4%', left: '37%', rot: -16, blur: 3, opacity: 0.5, float: 'a' },
];

function AlbumScatter() {
  return (
    <>
      {ALBUM_CARDS.map(card => (
        <div
          key={card.id}
          id={`album-card-${card.id}`}
          className={`album-card ${card.float === 'a' ? 'float-a' : 'float-b'}`}
          style={{
            width: card.w, height: card.w,
            top: card.top, left: card.left,
            '--rot': `${card.rot}deg`,
            transform: `rotate(${card.rot}deg)`,
            filter: card.blur ? `blur(${card.blur}px)` : 'none',
            opacity: card.opacity,
          }}
        >
          <img
            src={card.src}
            alt=""
            loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#EDE8DE'; }}
          />
        </div>
      ))}
    </>
  );
}

// ── Universal Logo (FIX 3) ─────────────────────────────────────────────────
function KaraLogo({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, userSelect: 'none',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}
      aria-label="Go to homepage"
    >
      <img
        src="/karama.png"
        alt="Kara"
        style={{ height: '32px', width: 'auto', borderRadius: '8px' }}
      />
      <span style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontWeight: 800, fontSize: 22,
        color: 'var(--text-primary)',
        letterSpacing: '-0.03em',
        display: 'flex', alignItems: 'center'
      }}>
        kara<span style={{ color: 'var(--star)', fontSize: 14, verticalAlign: 'super', marginLeft: 1 }}>✦</span>
      </span>
    </button>
  );
}

// ── Navigation bars ────────────────────────────────────────────────────────
function HeroNav({ onHowToClick, onLogoClick }) {
  const navigate = useNavigate();
  const { extractPitch } = usePitchExtraction();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPreset = async (track) => {
    setIsDropdownOpen(false);
    useAppStore.setState({
      song: track.title,
      artist: track.artist,
      audioSourceTab: 'preset',
      presetPath: `/presets/${track.preset}`,
      albumArt: track.cover,
      error: null
    });
    // Check if local image exists, if not set albumArt to fallback
    const img = new Image();
    img.src = track.cover;
    img.onerror = () => {
      useAppStore.setState({ albumArt: track.fallbackCover.replace('120x120bb', '600x600bb') });
    };
    runAnalysisPipeline({ navigate, extractPitch });
  };

  const presetSongs = [
    {
      title: 'Kesariya',
      artist: 'Arijit Singh',
      cover: '/presets/kesariya.jpg',
      fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/37/1b/09/371b09fa-7e44-adbf-939e-d309cb9f3f4c/8902894363235_cover.jpg/120x120bb.jpg',
      preset: 'kesariya.mp3'
    },
    {
      title: 'Pashmina',
      artist: 'Amit Trivedi',
      cover: '/presets/pashmina.jpg',
      fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b8/1c/b3/b81cb301-8bf8-d621-e034-789a7bb7d5d7/8902894356077_cover.jpg/120x120bb.jpg',
      preset: 'pashmina.mp3'
    },
    {
      title: 'Yeh Fitoor Mera',
      artist: 'Amit Trivedi',
      cover: '/presets/yeh_fitoor_mera.jpg',
      fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b8/1c/b3/b81cb301-8bf8-d621-e034-789a7bb7d5d7/8902894356077_cover.jpg/120x120bb.jpg',
      preset: 'yeh_fitoor_mera.mp3'
    }
  ];

  return (
    <nav className="kara-nav">
      <KaraLogo onClick={onLogoClick} />

      <div
        className="nav-links"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.04)',
          padding: '4px',
          borderRadius: '100px'
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="nav-hover-btn"
        >
          Home
        </button>
        <button
          onClick={() => navigate('/about')}
          className="nav-hover-btn"
        >
          About
        </button>
        <button
          onClick={() => navigate('/contact')}
          className="nav-hover-btn"
        >
          Contact Us
        </button>
      </div>

      <div className="nav-auth">
        <button
          onClick={onHowToClick}
          className="btn-login"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          How to use
        </button>
        <button className="btn-login">Log in</button>
        <button className="btn-signup">Sign up</button>
      </div>
    </nav>
  );
}

function StudioNav({ onHowToClick, onHome }) {
  return (
    <nav className="kara-nav">
      <KaraLogo onClick={onHome} />

      <div className="nav-auth">
        <button
          onClick={onHowToClick}
          className="btn-login"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          How to use
        </button>
      </div>
    </nav>
  );
}

function PlayerNav({ song, artist, onExit, accuracyScore }) {
  const albumArt = useAppStore(state => state.albumArt);

  return (
    <nav
      className="kara-nav player-nav-container"
      style={{ borderBottom: '0.5px solid var(--border-light)', background: 'var(--bg)' }}
    >
      <div className="player-nav-main-row">
        <KaraLogo onClick={onExit} />

        <div className="player-nav-actions">
          <button
            className="nav-how-to-use-btn"
            onClick={() => useAppStore.setState({ isHowToOpen: true })}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E0D8CC'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            How to use
          </button>

          {accuracyScore !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-pill)', padding: '6px 16px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Accuracy</span>
              <span style={{
                fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                color: accuracyScore >= 80 ? '#1D9E75' : accuracyScore >= 50 ? '#D4A017' : '#D85A30',
              }}>
                {accuracyScore}%
              </span>
            </div>
          )}

          <button
            id="try-another-song"
            onClick={onExit}
            style={{
              padding: '9px 20px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--text-primary)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Try another song
          </button>
        </div>
      </div>

      <div className="player-nav-metadata-row">
        {albumArt && (
          <img src={albumArt} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {song}
          </span>
          {artist && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', lineHeight: 1.2 }}>
              {artist}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

function AboutPage() {
  const navigate = useNavigate();
  const setIsHowToOpen = useAppStore(state => state.setIsHowToOpen);

  return (
    <>
      <HeroNav
        onHowToClick={() => setIsHowToOpen(true)}
        onLogoClick={() => navigate('/')}
      />
      <div style={{
        minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px',
        background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 32, padding: '120px 24px 60px'
      }}>
        <div className="hero-center fade-in-up" style={{ maxWidth: 660, width: '100%' }}>
          <div className="hero-badge">
            <span className="badge-star">✦</span>
            About Kara
          </div>
          <h2 className="hero-title" style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: '24px' }}>
            Built by a student, for the love of music.
          </h2>
          <div style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.03)'
          }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", marginBottom: '20px' }}>
              Hi! I'm an indie dev and student who loves both coding and karaoke. I built Kara as a passion project because I wanted a more intuitive way to see the melody and pitch of my favorite songs.
            </p>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", marginBottom: '20px' }}>
              Often, reading lyrics isn't enough to capture the emotion and timing of a song. By mapping out the pitch and visualizing the highs and lows, Kara acts as a musical guide to help you sing along perfectly.
            </p>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", marginBottom: '20px' }}>
              This project is powered by React, Web Audio API, and a whole lot of coffee. ☕
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              <button className="btn-cta" onClick={() => navigate('/studio')} style={{ padding: '12px 24px', fontSize: '14px' }}>
                Try Kara Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ContactPage() {
  const navigate = useNavigate();
  const setIsHowToOpen = useAppStore(state => state.setIsHowToOpen);

  return (
    <>
      <HeroNav
        onHowToClick={() => setIsHowToOpen(true)}
        onLogoClick={() => navigate('/')}
      />
      <div style={{
        minHeight: '100vh', paddingTop: '100px', paddingBottom: '60px',
        background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 32, padding: '120px 24px 60px'
      }}>
        <div className="hero-center fade-in-up" style={{ maxWidth: 660, width: '100%' }}>
          <div className="hero-badge">
            <span className="badge-star">✦</span>
            Get in Touch
          </div>
          <h2 className="hero-title" style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: '24px' }}>
            Say Hello!
          </h2>
          <div style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'left',
            boxShadow: '0 8px 32px rgba(0,0,0,0.03)'
          }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", marginBottom: '32px' }}>
              Whether you have feedback, found a bug, or just want to chat about indie development, I'd love to hear from you.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <a href="mailto:hello@kara.app" style={{
                display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none',
                color: 'var(--text-primary)', background: 'var(--bg)', padding: '16px 20px', borderRadius: '16px', border: '0.5px solid var(--border)'
              }}>
                <span style={{ fontSize: '20px' }}>✉️</span>
                <span style={{ fontSize: '15px', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>hello@kara.app</span>
              </a>
              <a href="https://github.com/indiedev" target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none',
                color: 'var(--text-primary)', background: 'var(--bg)', padding: '16px 20px', borderRadius: '16px', border: '0.5px solid var(--border)'
              }}>
                <span style={{ fontSize: '20px' }}>🐙</span>
                <span style={{ fontSize: '15px', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>GitHub</span>
              </a>
              <a href="https://twitter.com/indiedev" target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none',
                color: 'var(--text-primary)', background: 'var(--bg)', padding: '16px 20px', borderRadius: '16px', border: '0.5px solid var(--border)'
              }}>
                <span style={{ fontSize: '20px' }}>🐦</span>
                <span style={{ fontSize: '15px', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Twitter / X</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

function HeroPage() {
  const navigate = useNavigate();
  const setIsHowToOpen = useAppStore(state => state.setIsHowToOpen);

  return (
    <>
      <HeroNav
        onHowToClick={() => setIsHowToOpen(true)}
        onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
      <section className="kara-hero" aria-label="Hero">
        <AlbumScatter />
        <div className="hero-center fade-in-up">
          <div className="hero-badge fade-in-up fade-in-up-d1">
            <span className="badge-star">✦</span>
            Sing. Feel. Express.
          </div>
          <h1 className="hero-title fade-in-up fade-in-up-d2">
            Your stage.<br />Your song.
          </h1>
          <p className="hero-sub fade-in-up fade-in-up-d3">
            Karaoke your favorites.<br />Anytime, anywhere.
          </p>
          <button id="hero-cta" className="btn-cta fade-in-up fade-in-up-d4" onClick={() => navigate('/studio')}>
            Get Started
            <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
          </button>
          <div className="hero-features fade-in-up fade-in-up-d5">
            <div className="feature-pill">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <span className="feature-label">Trending Songs</span>
            </div>
            <div className="feature-pill">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" /><circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <span className="feature-label">Ai Pitch Guide</span>
            </div>
            <div className="feature-pill">
              <div className="feature-icon-wrap">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <span className="feature-label">Real-time Score</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StudioPage() {
  const navigate = useNavigate();
  const error = useAppStore(state => state.error);
  const setIsHowToOpen = useAppStore(state => state.setIsHowToOpen);
  const { extractPitch } = usePitchExtraction();

  return (
    <>
      <StudioNav onHowToClick={() => setIsHowToOpen(true)} onHome={() => navigate('/')} />
      <div style={{
        minHeight: '100vh', paddingTop: '90px', paddingBottom: '60px',
        background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 32,
      }}>
        <div className="hero-center fade-in-up" style={{ maxWidth: 660, width: '100%', padding: '0 20px' }}>
          <div className="hero-badge">
            <span className="badge-star">✦</span>
            Pitch Studio
          </div>
          <h2 className="hero-title" style={{ fontSize: 'clamp(36px, 5vw, 52px)' }}>
            Find your melody.
          </h2>
          <p className="hero-sub" style={{ fontSize: 14 }}>
            Search a song, upload audio, and watch your pitch come alive.
          </p>
        </div>

        <div className="kara-studio-panel fade-in-up fade-in-up-d2">
          <SearchBar />
          {error && <div className="kara-error" style={{ marginTop: 16 }}>{error}</div>}
          <AudioUploader />
        </div>

        {/* ── Quick Demo Presets Grid (PRO FIX) ── */}
        <div className="fade-in-up fade-in-up-d3" style={{ width: '100%', maxWidth: 580, padding: '0 20px', marginTop: -8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ color: 'var(--star)', fontSize: 12 }}>✦</span>
            <p style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0
            }}>
              Try a Quick Demo Track (Dynamic WASM Analysis)
            </p>
            <span style={{ color: 'var(--star)', fontSize: 12 }}>✦</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              {
                title: 'Kesariya',
                artist: 'Arijit Singh',
                cover: '/presets/kesariya.jpg',
                fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/37/1b/09/371b09fa-7e44-adbf-939e-d309cb9f3f4c/8902894363235_cover.jpg/120x120bb.jpg',
                preset: 'kesariya.mp3'
              },
              {
                title: 'Pashmina',
                artist: 'Amit Trivedi',
                cover: '/presets/pashmina.jpg',
                fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b8/1c/b3/b81cb301-8bf8-d621-e034-789a7bb7d5d7/8902894356077_cover.jpg/120x120bb.jpg',
                preset: 'pashmina.mp3'
              },
              {
                title: 'Yeh Fitoor Mera',
                artist: 'Amit Trivedi',
                cover: '/presets/yeh_fitoor_mera.jpg',
                fallbackCover: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/b8/1c/b3/b81cb301-8bf8-d621-e034-789a7bb7d5d7/8902894356077_cover.jpg/120x120bb.jpg',
                preset: 'yeh_fitoor_mera.mp3'
              }
            ].map((track, i) => (
              <button
                key={i}
                onClick={async () => {
                  useAppStore.setState({
                    song: track.title,
                    artist: track.artist,
                    audioSourceTab: 'preset',
                    presetPath: `/presets/${track.preset}`,
                    albumArt: track.cover, // Pre-assign local path
                    error: null
                  });
                  // Check if local image exists, if not set albumArt to fallback
                  const img = new Image();
                  img.src = track.cover;
                  img.onerror = () => {
                    useAppStore.setState({ albumArt: track.fallbackCover.replace('120x120bb', '600x600bb') });
                  };
                  runAnalysisPipeline({ navigate, extractPitch });
                }}
                className="preset-card"
                style={{
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--text-primary)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--border) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 0,
                    color: 'var(--text-primary)',
                    fontFamily: 'Inter, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.title}
                  </p>
                  <p style={{
                    fontSize: 11,
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontFamily: 'Inter, sans-serif',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.artist}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <p style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            marginTop: 10,
            opacity: 0.8
          }}>
            Tip: You can drop custom audio files in your <code style={{ fontSize: 10, background: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: 4 }}>client/public/presets/</code> folder named after these songs to load your own full tracks offline!
          </p>
        </div>
      </div>
    </>
  );
}

function PlayerPage() {
  const navigate = useNavigate();
  const song = useAppStore(state => state.song);
  const artist = useAppStore(state => state.artist);
  const accuracyScore = useAppStore(state => state.accuracyScore);
  const isAnalyzing = useAppStore(state => state.isAnalyzing);
  const audioBuffer = useAppStore(state => state.audioBuffer);
  const { stop } = useAudioControls();

  const exitPlayer = React.useCallback(() => {
    stop();
    const abortFn = window.__karaAbortAnalysis;
    if (typeof abortFn === 'function') {
      abortFn();
      window.__karaAbortAnalysis = null;
    }
    useAppStore.setState({
      alignedLyrics: [],
      isPlaying: false,
      audioBuffer: null,
      isAnalyzing: false,
      showPlayer: false,
      analysisStep: '',
      currentTime: 0,
      albumArt: null,
      syncOffsetMs: 0,
    });
    navigate('/studio');
  }, [stop, navigate]);

  const isFullscreen = useAppStore(state => state.isFullscreen);

  // If no audio buffer and not analyzing, go back to studio
  React.useEffect(() => {
    if (!audioBuffer && !isAnalyzing) {
      navigate('/studio');
    }
  }, [audioBuffer, isAnalyzing, navigate]);

  if (isAnalyzing) {
    return <AnalysisLoadingScreen onCancel={exitPlayer} />;
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      {!isFullscreen && (
        <PlayerNav
          song={song}
          artist={artist}
          onExit={exitPlayer}
          accuracyScore={accuracyScore}
        />
      )}
      <div style={{
        flex: 1,
        minHeight: 0,
        padding: isFullscreen ? '0px' : '8px 24px 120px',
        marginTop: isFullscreen ? 0 : 72,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <PitchCanvas />
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <PlaybackControls />
      </div>
    </div>
  );
}

// ── App root ───────────────────────────────────────────────────────────────
function App() {
  useMicPitch();
  const location = useLocation();
  const { stop } = useAudioControls();

  // Robustly stop audio and reset state whenever navigating away from the player (e.g. browser Back button)
  React.useEffect(() => {
    if (location.pathname !== '/player') {
      stop();
      const abortFn = window.__karaAbortAnalysis;
      if (typeof abortFn === 'function') {
        abortFn();
        window.__karaAbortAnalysis = null;
      }
      useAppStore.setState({
        alignedLyrics: [],
        isPlaying: false,
        audioBuffer: null,
        isAnalyzing: false,
        showPlayer: false,
        analysisStep: '',
        currentTime: 0,
        albumArt: null,
        syncOffsetMs: 0,
      });
    }
  }, [location.pathname, stop]);

  return (
    <>
      <Routes>
        <Route path="/" element={<HeroPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/player" element={<PlayerPage />} />
      </Routes>
      <HowToModal />
    </>
  );
}

export default App;
