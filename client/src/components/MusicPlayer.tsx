import { useState, useRef, useEffect } from 'react';
import styles from './MusicPlayer.module.css';

// Preset music stations
const MUSIC_PRESETS = [
    { id: 'jfKfPfyJRdk', name: 'Lofi Girl', icon: '🎧' },
    { id: 'rUxyKA_-grg', name: 'Chill Vibes', icon: '🌊' },
    { id: '5qap5aO4i9A', name: 'Chillhop', icon: '☕' },
    { id: 'kgx4WGK0oNU', name: 'Jazz Lofi', icon: '🎷' },
    { id: 'lTRiuFIWV54', name: 'Rain + Lofi', icon: '🌧️' },
];

export default function MusicPlayer() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeVideo, setActiveVideo] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [customUrl, setCustomUrl] = useState('');

    // Drag state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLButtonElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Extract YouTube video ID
    const getYoutubeId = (url: string): string | null => {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!dragRef.current) return;
        const rect = dragRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newX = window.innerWidth - e.clientX - (44 - dragOffset.current.x);
            const newY = window.innerHeight - e.clientY - (44 - dragOffset.current.y);
            setPosition({
                x: Math.max(0, Math.min(newX, window.innerWidth - 60)),
                y: Math.max(0, Math.min(newY, window.innerHeight - 60))
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handlePlayPreset = (videoId: string) => {
        setActiveVideo(videoId);
    };

    const handlePlayCustom = () => {
        const videoId = getYoutubeId(customUrl);
        if (videoId) {
            setActiveVideo(videoId);
            setCustomUrl('');
        }
    };

    const handleStop = () => {
        setActiveVideo('');
    };

    const handleToggle = () => {
        if (!isDragging) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <>
            {/* Floating draggable button */}
            <button
                ref={dragRef}
                className={`${styles.musicButton} ${isDragging ? styles.dragging : ''}`}
                onClick={handleToggle}
                onMouseDown={handleMouseDown}
                style={{
                    right: `${16 + position.x}px`,
                    bottom: `${16 + position.y}px`
                }}
                title="Música (arrastra para mover)"
            >
                {activeVideo ? '🎵' : '🔇'}
            </button>

            {/* Hidden player - keeps playing when panel is closed */}
            {activeVideo && !isOpen && (
                <iframe
                    src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&loop=1&playlist=${activeVideo}${isMuted ? '&mute=1' : ''}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className={styles.hiddenPlayer}
                />
            )}

            {/* Panel */}
            {isOpen && (
                <div
                    className={styles.musicPanel}
                    style={{
                        right: `${16 + position.x}px`,
                        bottom: `${60 + position.y}px`
                    }}
                >
                    <div className={styles.header}>
                        <h3>🎵 Música</h3>
                        <button onClick={() => setIsOpen(false)}>✕</button>
                    </div>

                    <div className={styles.content}>
                        {/* Preset stations */}
                        <div className={styles.presets}>
                            <span className={styles.label}>Estaciones de radio:</span>
                            <div className={styles.presetGrid}>
                                {MUSIC_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        className={`${styles.presetBtn} ${activeVideo === preset.id ? styles.active : ''}`}
                                        onClick={() => handlePlayPreset(preset.id)}
                                    >
                                        <span className={styles.presetIcon}>{preset.icon}</span>
                                        <span className={styles.presetName}>{preset.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom URL */}
                        <div className={styles.customUrl}>
                            <span className={styles.label}>O pega un link de YouTube:</span>
                            <div className={styles.urlRow}>
                                <input
                                    value={customUrl}
                                    onChange={e => setCustomUrl(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && handlePlayCustom()}
                                    placeholder="https://youtube.com/..."
                                />
                                <button onClick={handlePlayCustom}>▶</button>
                            </div>
                        </div>

                        {/* Player */}
                        {activeVideo && (
                            <div className={styles.player}>
                                <iframe
                                    src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&loop=1&playlist=${activeVideo}${isMuted ? '&mute=1' : ''}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className={styles.video}
                                />

                                <div className={styles.controls}>
                                    <button
                                        className={`${styles.controlBtn} ${isMuted ? styles.muted : ''}`}
                                        onClick={() => setIsMuted(!isMuted)}
                                    >
                                        {isMuted ? '🔇 Muted' : '🔊 Sonando'}
                                    </button>
                                    <button className={styles.stopBtn} onClick={handleStop}>
                                        ⏹ Parar
                                    </button>
                                </div>
                            </div>
                        )}

                        {!activeVideo && (
                            <div className={styles.noMusic}>
                                Selecciona una estación o pega un link
                            </div>
                        )}

                        <p className={styles.note}>
                            💡 Arrastra el botón 🎵 para moverlo. La música sigue sonando al cerrar.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
