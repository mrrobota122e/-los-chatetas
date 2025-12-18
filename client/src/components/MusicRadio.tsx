import { useState, useRef } from 'react';

// Using direct YouTube audio or reliable streaming
const RADIO_STATIONS = [
    { name: '🎵 Lo-Fi Beats', url: 'https://usa9.fastcast4u.com/proxy/jamz?mp=/1' },
    { name: '🎸 Rock', url: 'https://usa9.fastcast4u.com/proxy/classicrock?mp=/1' },
    { name: '🎤 Pop Hits', url: 'https://streams.radiobob.de/bob-national/mp3-192/mediaplayer' },
    { name: '🎹 Chill', url: 'https://streams.radiobob.de/bob-shlf/mp3-192/mediaplayer' },
];

export default function MusicRadio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStation, setCurrentStation] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = 0.3;
            audioRef.current.play().catch(() => {
                alert('Click de nuevo para reproducir música');
            });
            setIsPlaying(true);
        }
    };

    const changeStation = (index: number) => {
        setCurrentStation(index);
        setIsPlaying(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.load();
        }
    };

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
    };

    const buttonStyle: React.CSSProperties = {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        background: isPlaying
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: 'none',
        cursor: 'pointer',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s',
    };

    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '60px',
        right: '0',
        background: 'rgba(20, 20, 30, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '15px',
        width: '200px',
        display: isExpanded ? 'block' : 'none',
        backdropFilter: 'blur(10px)',
    };

    const stationStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px',
        marginBottom: '5px',
        borderRadius: '8px',
        background: active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
        border: active ? '1px solid #22c55e' : '1px solid transparent',
        cursor: 'pointer',
        color: '#fff',
        fontSize: '14px',
        transition: 'all 0.2s',
    });

    return (
        <div style={containerStyle}>
            <audio ref={audioRef} src={RADIO_STATIONS[currentStation].url} />

            <div style={panelStyle}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>
                    📻 Radio - Selecciona y dale Play
                </div>
                {RADIO_STATIONS.map((station, idx) => (
                    <div
                        key={idx}
                        style={stationStyle(currentStation === idx)}
                        onClick={() => changeStation(idx)}
                    >
                        {station.name}
                    </div>
                ))}
                <button
                    onClick={togglePlay}
                    style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isPlaying ? '#ef4444' : '#22c55e',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                    }}
                >
                    {isPlaying ? '⏹ Parar' : '▶ Reproducir'}
                </button>
            </div>

            <button
                style={buttonStyle}
                onClick={() => setIsExpanded(!isExpanded)}
                title="Click para abrir radio"
            >
                {isPlaying ? '🎵' : '📻'}
            </button>
        </div>
    );
}
