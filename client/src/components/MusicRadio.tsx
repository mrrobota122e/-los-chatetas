import { useEffect, useRef, useState } from 'react';

// Background music that auto-plays
const MUSIC_URL = 'https://streams.ilovemusic.de/iloveradio17.mp3';

export default function BackgroundMusic() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    useEffect(() => {
        // Try to auto-play on mount
        const tryAutoPlay = () => {
            if (audioRef.current) {
                audioRef.current.volume = 0.2;
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        // Autoplay blocked - will need user interaction
                    });
            }
        };

        // Try immediately
        tryAutoPlay();

        // Also try on first user interaction
        const handleInteraction = () => {
            if (!hasInteracted) {
                setHasInteracted(true);
                tryAutoPlay();
            }
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, [hasInteracted]);

    const toggleMusic = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = 0.2;
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => { });
        }
    };

    return (
        <>
            <audio ref={audioRef} src={MUSIC_URL} loop />
            <button
                onClick={toggleMusic}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
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
                    zIndex: 1000,
                    transition: 'all 0.3s',
                }}
                title={isPlaying ? 'Pausar música' : 'Reproducir música'}
            >
                {isPlaying ? '🎵' : '🔇'}
            </button>
        </>
    );
}
