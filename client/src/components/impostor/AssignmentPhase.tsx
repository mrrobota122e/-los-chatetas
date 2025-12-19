import { useEffect, useState } from 'react';
import styles from './AssignmentPhase.module.css';

interface AssignmentPhaseProps {
    footballer: any | null;
    isImpostor: boolean;
    duration: number;
}

export default function AssignmentPhase({ footballer, isImpostor, duration }: AssignmentPhaseProps) {
    const [timeLeft, setTimeLeft] = useState(Math.floor(duration / 1000));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.timer}>
                {timeLeft}s
            </div>

            <div className={styles.card + ' glass-strong'}>
                {isImpostor ? (
                    <div className={styles.impostorCard}>
                        <div className={styles.icon}>🎭</div>
                        <h1 className={styles.title + ' neon-text-red'}>
                            ERES EL IMPOSTOR
                        </h1>
                        <p className={styles.subtitle}>
                            No tienes futbolista asignado
                        </p>
                        <div className={styles.instructions}>
                            <p>🎯 Tu Objetivo:</p>
                            <ul>
                                <li>Escucha las pistas de los demás</li>
                                <li>Inventa una pista convincente cuando sea tu turno</li>
                                <li>No seas descubierto en la votación</li>
                                <li>Sobrevive para ganar</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className={styles.crewCard}>
                        <div className={styles.icon}>⚽</div>
                        <h1 className={styles.title + ' neon-text-blue'}>
                            TU FUTBOLISTA
                        </h1>
                        {footballer && (
                            <div className={styles.footballerInfo}>
                                <h2 className={styles.footballerName}>{footballer.name}</h2>
                                <div className={styles.footballerDetails}>
                                    <span className={styles.detail}>
                                        <span className={styles.label}>Equipo:</span> {footballer.team}
                                    </span>
                                    <span className={styles.detail}>
                                        <span className={styles.label}>Posición:</span> {footballer.position}
                                    </span>
                                    <span className={styles.detail}>
                                        <span className={styles.label}>Nacionalidad:</span> {footballer.nationality}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className={styles.instructions}>
                            <p>🎯 Tu Objetivo:</p>
                            <ul>
                                <li>Da pistas sobre tu futbolista sin revelar su nombre</li>
                                <li>Descubre quién es el impostor</li>
                                <li>Vota para eliminarlo</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <p className={styles.warning}>
                ⚠️ Memoriza bien esta información. La fase de pistas comienza en {timeLeft} segundos.
            </p>
        </div>
    );
}
