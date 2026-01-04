import { useState, useEffect } from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
    onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Iniciando...');

    useEffect(() => {
        const steps = [
            { progress: 10, status: '🌐 Conectando al servidor...' },
            { progress: 30, status: '🔍 Verificando versión...' },
            { progress: 50, status: '📦 Cargando recursos...' },
            { progress: 70, status: '⚡ Sincronizando datos...' },
            { progress: 90, status: '🎮 Preparando interfaz...' },
            { progress: 100, status: '✅ ¡Listo!' },
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                setProgress(steps[i].progress);
                setStatus(steps[i].status);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(onComplete, 500);
            }
        }, 400);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className={styles.container}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>🎭</span>
                <h1>IMPOSTOR</h1>
            </div>

            <div className={styles.progressContainer}>
                <div
                    className={styles.progressBar}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <p className={styles.status}>{status}</p>

            <div className={styles.dots}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
            </div>
        </div>
    );
}

