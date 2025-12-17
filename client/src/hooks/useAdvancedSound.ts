import { useEffect, useRef, useState } from 'react';

// ONLY short sound effects - NO background music!
export const useAdvancedSound = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [masterVolume, setMasterVolume] = useState(0.5);

    // Play short sound effect
    const playSound = (soundType: string) => {
        if (isMuted) return;

        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            switch (soundType) {
                case 'buttonClick':
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                    gain.gain.setValueAtTime(0.3 * masterVolume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.type = 'sine';
                    break;
                case 'vote':
                case 'clue':
                    osc.frequency.value = 600;
                    gain.gain.setValueAtTime(0.25 * masterVolume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                    osc.type = 'sine';
                    break;
                default:
                    osc.frequency.value = 600;
                    gain.gain.setValueAtTime(0.2 * masterVolume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.type = 'sine';
            }

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {
            // Audio not available
        }
    };

    // NO background music - disabled per user request
    const playBackgroundMusic = (_type: string) => {
        // Disabled - user doesn't want synthetic sounds
    };

    const stopBackgroundMusic = () => {
        // No-op
    };

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const updateVolume = (volume: number) => {
        setMasterVolume(volume);
    };

    const preloadSound = (_soundKey: string) => {
        // No-op
    };

    return {
        playSound,
        playBackgroundMusic,
        stopBackgroundMusic,
        preloadSound,
        toggleMute,
        updateVolume,
        isMuted,
        masterVolume
    };
};

export default useAdvancedSound;
