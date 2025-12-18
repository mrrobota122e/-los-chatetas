import { useState, useEffect } from 'react';
import styles from './LoadingScreen.module.css';
import { APP_VERSION } from '../config';

interface LoadingScreenProps {
    onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Iniciando...');
    const [showChangelog, setShowChangelog] = useState(false);

    useEffect(() => {
        const steps = [
            { progress: 10, status: 'Conectando al servidor...' },
            { progress: 30, status: 'Verificando versión...' },
            { progress: 50, status: 'Cargando recursos...' },
            { progress: 70, status: 'Sincronizando datos...' },
            { progress: 90, status: 'Preparando interfaz...' },
            { progress: 100, status: '¡Listo!' },
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                setProgress(steps[i].progress);
                setStatus(steps[i].status);
                i++;
            } else {
                clearInterval(interval);

                // Check for version update
                const lastVersion = localStorage.getItem('lastVersion');
                if (lastVersion !== APP_VERSION) {
                    setShowChangelog(true);
                    localStorage.setItem('lastVersion', APP_VERSION);
                } else {
                    setTimeout(onComplete, 500);
                }
            }
        }, 400);

        return () => clearInterval(interval);
    }, [onComplete]);

    if (showChangelog) {
        return (
            <div className={styles.container}>
                <div className={styles.updateModal}>
                    <div className={styles.updateIcon}>🎮</div>
                    <h1>¡Nueva Actualización!</h1>
                    <h2>v{APP_VERSION}</h2>

                    <div className={styles.changelog}>
                        <h3>📋 Cambios:</h3>
                        <ul>
                            <li>🎨 Nuevo diseño estilo Among Us</li>
                            <li>🔄 Sincronización mejorada</li>
                            <li>🎭 Nuevas animaciones de rol</li>
                            <li>🗳️ Sistema de votación mejorado</li>
                            <li>📱 Pantalla de carga</li>
                        </ul>
                    </div>

                    <button
                        className={styles.playButton}
                        onClick={onComplete}
                    >
                        ¡Jugar!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.logo}>
                <span className={styles.logoIcon}>🎭</span>
                <h1>IMPOSTOR</h1>
                <p className={styles.version}>v{APP_VERSION}</p>
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

            <p className={styles.footer}>AARON STUD10S</p>
        </div>
    );
}
