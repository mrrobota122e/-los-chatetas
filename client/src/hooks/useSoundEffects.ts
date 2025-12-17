import { useEffect, useRef, useCallback } from 'react';

// Sound effect URLs (will use freesound.org or generate beep tones)
const SOUND_URLS = {
    click: '/sounds/click.mp3',
    hover: '/sounds/hover.mp3',
    clue: '/sounds/clue.mp3',
    vote: '/sounds/vote.mp3',
    alert: '/sounds/alert.mp3',
    win: '/sounds/win.mp3',
    lose: '/sounds/lose.mp3',
    join: '/sounds/join.mp3',
    leave: '/sounds/leave.mp3',
    ready: '/sounds/ready.mp3',
    countdown: '/sounds/countdown.mp3',
    // Ambient music - fun upbeat background
    ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
};

type SoundName = keyof typeof SOUND_URLS;

interface UseSoundEffectsReturn {
    playSound: (name: SoundName, volume?: number) => void;
    playAmbient: (volume?: number) => void;
    stopAmbient: () => void;
    stopAll: () => void;
    setMasterVolume: (volume: number) => void;
    isMuted: boolean;
    toggleMute: () => void;
}

/**
 * Enhanced Sound Effects Hook
 * Provides comprehensive audio feedback with volume control and muting
 */
export function useSoundEffects(): UseSoundEffectsReturn {
    const audioContextRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
    const masterVolumeRef = useRef(0.5);
    const isMutedRef = useRef(false);

    // Preload all sounds
    useEffect(() => {
        Object.entries(SOUND_URLS).forEach(([name, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            audio.volume = masterVolumeRef.current;
            audioContextRef.current.set(name as SoundName, audio);
        });

        return () => {
            // Cleanup
            audioContextRef.current.forEach((audio) => {
                audio.pause();
                audio.src = '';
            });
            audioContextRef.current.clear();
        };
    }, []);

    const playSound = useCallback((name: SoundName, volume: number = 1.0) => {
        if (isMutedRef.current) return;

        const audio = audioContextRef.current.get(name);
        if (audio) {
            audio.volume = Math.min(1, masterVolumeRef.current * volume);
            audio.currentTime = 0;
            audio.play().catch((err) => {
                console.warn(`Failed to play sound ${name}:`, err);
            });
        }
    }, []);

    const stopAll = useCallback(() => {
        audioContextRef.current.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
        });
    }, []);

    const setMasterVolume = useCallback((volume: number) => {
        masterVolumeRef.current = Math.max(0, Math.min(1, volume));
        audioContextRef.current.forEach((audio) => {
            audio.volume = masterVolumeRef.current;
        });
    }, []);

    const toggleMute = useCallback(() => {
        isMutedRef.current = !isMutedRef.current;
        return isMutedRef.current;
    }, []);

    const playAmbient = useCallback((volume: number = 0.3) => {
        if (isMutedRef.current) return;
        const ambient = audioContextRef.current.get('ambient');
        if (ambient) {
            ambient.loop = true;
            ambient.volume = Math.min(1, masterVolumeRef.current * volume);
            ambient.play().catch(err => console.warn('Failed to play ambient:', err));
        }
    }, []);

    const stopAmbient = useCallback(() => {
        const ambient = audioContextRef.current.get('ambient');
        if (ambient) {
            ambient.pause();
            ambient.currentTime = 0;
        }
    }, []);

    return {
        playSound,
        playAmbient,
        stopAmbient,
        stopAll,
        setMasterVolume,
        isMuted: isMutedRef.current,
        toggleMute,
    };
}
