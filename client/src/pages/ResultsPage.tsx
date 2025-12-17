import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Skull, RotateCcw, Home, Clock, Hash, Award } from 'lucide-react';
import styles from './ResultsPage.module.css';

export default function ResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { winner, impostorName, word, statistics, roomCode } = location.state || {};

    const isInnocentsWin = winner === 'INNOCENTS';

    return (
        <div className={`${styles.container} ${isInnocentsWin ? styles.innocentsWin : styles.impostorWin}`}>
            <div className={styles.content}>
                <div className={styles.header}>
                    {isInnocentsWin ? (
                        <>
                            <Trophy size={80} className={styles.winIcon} />
                            <h1 className={styles.title}>VICTORIA</h1>
                            <p className={styles.subtitle}>LOS INOCENTES HAN GANADO</p>
                        </>
                    ) : (
                        <>
                            <Skull size={80} className={styles.lossIcon} />
                            <h1 className={styles.title}>DERROTA</h1>
                            <p className={styles.subtitle}>EL IMPOSTOR HA GANADO</p>
                        </>
                    )}
                </div>

                <div className={styles.mainInfo}>
                    <div className={styles.infoCard}>
                        <span className={styles.label}>EL IMPOSTOR ERA</span>
                        <span className={styles.value}>{impostorName || '?'}</span>
                    </div>

                    {word && (
                        <div className={styles.infoCard}>
                            <span className={styles.label}>LA PALABRA ERA</span>
                            <span className={`${styles.value} ${styles.wordValue}`}>{word}</span>
                        </div>
                    )}
                </div>

                {statistics && (
                    <div className={styles.statsContainer}>
                        <div className={styles.statItem}>
                            <Hash size={20} />
                            <span>{statistics.totalRounds || 0} Rondas</span>
                        </div>
                        <div className={styles.statItem}>
                            <Clock size={20} />
                            <span>{Math.floor((statistics.duration || 0) / 60)}m {(statistics.duration || 0) % 60}s</span>
                        </div>
                        {statistics.mvp && (
                            <div className={`${styles.statItem} ${styles.mvp}`}>
                                <Award size={20} />
                                <span>MVP: {statistics.mvp.playerName}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        className={styles.playAgainBtn}
                        onClick={() => {
                            localStorage.removeItem('currentGame');
                            if (roomCode) {
                                navigate(`/room/${roomCode}`);
                            } else {
                                localStorage.removeItem('currentRoom');
                                navigate('/menu');
                            }
                        }}
                    >
                        <RotateCcw size={24} />
                        <span>JUGAR OTRA VEZ</span>
                    </button>

                    <button
                        className={styles.menuBtn}
                        onClick={() => navigate('/menu')}
                    >
                        <Home size={24} />
                        <span>MENÚ PRINCIPAL</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
