import { useState, useRef, useEffect } from 'react';

const RADIO_STATIONS = [
    { name: '🎵 Lo-Fi Beats', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
    { name: '🎸 Rock Classics', url: 'https://streams.ilovemusic.de/iloveradio16.mp3' },
    { name: '🎤 Pop Hits', url: 'https://streams.ilovemusic.de/iloveradio1.mp3' },
    { name: '🎹 Chill Out', url: 'https://streams.ilovemusic.de/iloveradio14.mp3' },
];

export default function MusicRadio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStation, setCurrentStation] = useState(0);
    const [volume, setVolume] = useState(0.3);
    const [isExpanded, setIsExpanded] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => {
                // Autoplay blocked, user interaction needed
            });
        }
        setIsPlaying(!isPlaying);
    };

    const changeStation = (index: number) => {
        setCurrentStation(index);
        if (audioRef.current && isPlaying) {
            audioRef.current.load();
            audioRef.current.play().catch(() => { });
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
            : 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
        border: 'none',
        cursor: 'pointer',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    };

    const panelStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: '60px',
        right: '0',
        background: 'rgba(20, 20, 30, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '15px',
        width: '220px',
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

    const volumeStyle: React.CSSProperties = {
        width: '100%',
        marginTop: '10px',
        accentColor: '#22c55e',
    };

    return (
        <div style={containerStyle}>
            <audio ref={audioRef} src={RADIO_STATIONS[currentStation].url} />

            <div style={panelStyle}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>
                    📻 Radio Stations
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
                <div style={{ marginTop: '10px', color: '#888', fontSize: '12px' }}>
                    🔊 Volumen
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={volumeStyle}
                />
            </div>

            <button
                style={buttonStyle}
                onClick={() => setIsExpanded(!isExpanded)}
                onDoubleClick={togglePlay}
                title="Click para expandir, doble-click para play/pause"
            >
                {isPlaying ? '🎵' : '📻'}
            </button>
        </div>
    );
}
