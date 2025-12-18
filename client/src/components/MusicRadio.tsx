import { useEffect, useRef, useState } from 'react';

// Radio stations
const RADIO_STATIONS = [
    { name: '🎵 Lo-Fi Beats', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
    { name: '🎸 Rock', url: 'https://streams.ilovemusic.de/iloveradio16.mp3' },
    { name: '🎤 Pop Hits', url: 'https://streams.ilovemusic.de/iloveradio1.mp3' },
    { name: '🎹 Chill', url: 'https://streams.ilovemusic.de/iloveradio21.mp3' },
];

export default function MusicRadio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStation, setCurrentStation] = useState(0);
    const [volume, setVolume] = useState(0.15); // Low volume by default
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const hasTriedAutoplay = useRef(false);

    // Auto-play when component mounts
    useEffect(() => {
        if (!hasTriedAutoplay.current && audioRef.current) {
            hasTriedAutoplay.current = true;
            audioRef.current.volume = volume;
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => {
                    // Autoplay blocked - try on first user interaction
                    const tryPlay = () => {
                        if (audioRef.current && !isPlaying) {
                            audioRef.current.volume = volume;
                            audioRef.current.play()
                                .then(() => setIsPlaying(true))
                                .catch(() => { });
                        }
                        document.removeEventListener('click', tryPlay);
                    };
                    document.addEventListener('click', tryPlay);
                });
        }
    }, []);

    // Update volume when slider changes
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = volume;
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => { });
        }
    };

    const changeStation = (index: number) => {
        setCurrentStation(index);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.load();
            if (isPlaying) {
                audioRef.current.play().catch(() => { });
            }
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            fontFamily: 'Arial, sans-serif',
        }}>
            <audio ref={audioRef} src={RADIO_STATIONS[currentStation].url} loop />

            {/* Expanded Panel */}
            {isExpanded && (
                <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    right: '0',
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '15px',
                    width: '220px',
                    backdropFilter: 'blur(10px)',
                }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>
                        📻 Selecciona estación
                    </div>

                    {RADIO_STATIONS.map((station, idx) => (
                        <div
                            key={idx}
                            onClick={() => changeStation(idx)}
                            style={{
                                padding: '10px',
                                marginBottom: '5px',
                                borderRadius: '8px',
                                background: currentStation === idx ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                                border: currentStation === idx ? '1px solid #ef4444' : '1px solid transparent',
                                cursor: 'pointer',
                                color: currentStation === idx ? '#f87171' : '#fff',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                            }}
                        >
                            {station.name}
                        </div>
                    ))}

                    {/* Volume Slider */}
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🔊 Volumen: {Math.round(volume * 100)}%
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            style={{
                                width: '100%',
                                accentColor: '#ef4444',
                                cursor: 'pointer',
                            }}
                        />
                    </div>

                    {/* Play/Pause Button */}
                    <button
                        onClick={togglePlay}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: 'none',
                            background: isPlaying
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
                    </button>
                </div>
            )}

            {/* Main Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: isPlaying
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                }}
                title="Click para abrir radio"
            >
                {isPlaying ? '🎵' : '🔇'}
            </button>
        </div>
    );
}
