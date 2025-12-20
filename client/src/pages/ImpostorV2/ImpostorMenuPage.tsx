import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorMenuPage.module.css';

export default function ImpostorMenuPage() {
    const navigate = useNavigate();
    const { socket, isConnected } = useSocket();
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const handleCreateRoom = () => {
        if (!playerName.trim() || !socket) return;
        setLoading(true);
        localStorage.setItem('playerName', playerName.trim());

        socket.emit('room:create', {
            hostName: playerName.trim(),
            maxPlayers: 8,
            mode: 'IMPOSTOR_V2' as any
        });

        socket.once('room:created', (data) => {
            setLoading(false);
            navigate(`/impostor-v2/lobby/${data.roomCode}`);
        });

        socket.once('room:error', (error) => {
            setLoading(false);
            alert(error.message);
        });
    };

    const handleJoinRoom = () => {
        if (!playerName.trim() || !roomCode.trim()) return;
        localStorage.setItem('playerName', playerName.trim());
        navigate(`/impostor-v2/lobby/${roomCode.toUpperCase()}`);
    };

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.particle} />
                <div className={styles.particle} />
                <div className={styles.particle} />
            </div>

            <button className={styles.backButton} onClick={() => navigate('/menu')}>
                ← Menú
            </button>

            <div className={styles.connectionStatus}>
                <span className={isConnected ? styles.online : styles.offline}>
                    ● {isConnected ? 'Online' : 'Offline'}
                </span>
            </div>

            <div className={styles.content}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>🛡️</div>
                    <div className={styles.sparkle}>✨</div>
                </div>

                <h1 className={styles.title}>EL IMPOSTOR</h1>
                <p className={styles.subtitle}>¿Quién no conoce la palabra secreta?</p>

                <div className={styles.nameTag}>
                    🎮 Jugando como <span className={styles.playerName}>{playerName || 'ANÓNIMO'}</span>
                </div>

                <div className={styles.buttonContainer}>
                    <button
                        className={styles.createButton}
                        onClick={handleCreateRoom}
                        disabled={!playerName.trim() || loading || !isConnected}
                    >
                        <span className={styles.buttonIcon}>+</span>
                        <div className={styles.buttonText}>
                            <span className={styles.buttonTitle}>CREAR SALA</span>
                            <span className={styles.buttonSubtitle}>Inicia una nueva partida</span>
                        </div>
                    </button>

                    <button
                        className={styles.joinButton}
                        onClick={() => setShowJoinModal(true)}
                        disabled={!isConnected}
                    >
                        <span className={styles.buttonIcon}>→</span>
                        <div className={styles.buttonText}>
                            <span className={styles.buttonTitle}>UNIRSE</span>
                            <span className={styles.buttonSubtitle}>Ingresa un código</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Join Modal */}
            {showJoinModal && (
                <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Unirse a Sala</h2>
                        <input
                            type="text"
                            className={styles.codeInput}
                            placeholder="Código de 4 letras"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            maxLength={4}
                            autoFocus
                        />
                        <div className={styles.modalButtons}>
                            <button className={styles.cancelBtn} onClick={() => setShowJoinModal(false)}>
                                Cancelar
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={handleJoinRoom}
                                disabled={roomCode.length < 4}
                            >
                                Unirse
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
