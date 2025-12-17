import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './IntroPage.module.css';

// Epic intro sound using Web Audio API
const playEpicSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;

        // Deep bass hit
        const bass = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(60, now);
        bass.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        bass.connect(bassGain);
        bassGain.connect(ctx.destination);
        bass.start(now);
        bass.stop(now + 1);

        // Rising swoosh
        const swoosh = ctx.createOscillator();
        const swooshGain = ctx.createGain();
        swoosh.type = 'sawtooth';
        swoosh.frequency.setValueAtTime(100, now);
        swoosh.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        swooshGain.gain.setValueAtTime(0.15, now);
        swooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        swoosh.connect(swooshGain);
        swooshGain.connect(ctx.destination);
        swoosh.start(now);
        swoosh.stop(now + 0.5);

        // Epic chord (C major with octave)
        const notes = [130.81, 164.81, 196, 261.63]; // C3, E3, G3, C4
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + 0.3);
            gain.gain.setValueAtTime(0.2, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + 0.3);
            osc.stop(now + 3);
        });
    } catch (e) {
        console.log('Audio not available');
    }
};

export default function IntroPage() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<'black' | 'flash' | 'logo' | 'presents' | 'fade'>('black');

    useEffect(() => {
        // Phase timeline like Marvel intro
        const timers = [
            setTimeout(() => { setPhase('flash'); playEpicSound(); }, 500), // Flash + SOUND
            setTimeout(() => setPhase('logo'), 800),       // Show logo
            setTimeout(() => setPhase('presents'), 3500),  // Present text
            setTimeout(() => setPhase('fade'), 5000),      // Fade out
            setTimeout(() => navigate('/menu'), 6000),      // Navigate to Menu
        ];

        return () => timers.forEach(t => clearTimeout(t));
    }, [navigate]);

    return (
        <div className={styles.introContainer}>
            {/* Flash effect */}
            <div className={`${styles.flash} ${phase === 'flash' ? styles.active : ''}`} />

            {/* Background with particles/dust */}
            <div className={styles.dustParticles}>
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className={styles.dust}
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    />
                ))}
            </div>

            {/* Animated light rays */}
            <div className={styles.lightRays}>
                <div className={styles.ray} />
                <div className={styles.ray} />
                <div className={styles.ray} />
            </div>

            {/* Main Logo - Marvel style single line */}
            <div className={`${styles.logoContainer} ${phase !== 'black' && phase !== 'flash' ? styles.show : ''} ${phase === 'fade' ? styles.fadeOut : ''}`}>
                {/* Glowing backdrop */}
                <div className={styles.glowBackdrop} />

                {/* The logo text */}
                <h1 className={styles.logo}>
                    <span className={styles.logoLetter}>A</span>
                    <span className={styles.logoLetter}>A</span>
                    <span className={styles.logoLetter}>R</span>
                    <span className={styles.logoLetter}>O</span>
                    <span className={styles.logoLetter}>N</span>
                    <span className={styles.logoSpace}></span>
                    <span className={styles.logoLetter}>S</span>
                    <span className={styles.logoLetter}>T</span>
                    <span className={styles.logoLetter}>U</span>
                    <span className={styles.logoLetter}>D</span>
                    <span className={`${styles.logoLetter} ${styles.number}`}>1</span>
                    <span className={`${styles.logoLetter} ${styles.number}`}>0</span>
                    <span className={styles.logoLetter}>S</span>
                </h1>

                {/* Underline effect */}
                <div className={styles.underline} />

                {/* "PRESENTS" text */}
                <div className={`${styles.presents} ${phase === 'presents' || phase === 'fade' ? styles.showPresents : ''}`}>
                    <span>P</span><span>R</span><span>E</span><span>S</span>
                    <span>E</span><span>N</span><span>T</span><span>A</span>
                </div>
            </div>

            {/* Skip button */}
            <button
                className={styles.skipBtn}
                onClick={() => navigate('/menu')}
            >
                SALTAR
            </button>
        </div>
    );
}
