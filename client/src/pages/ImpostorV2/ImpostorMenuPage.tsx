import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorMenuPage.module.css';

export default function ImpostorMenuPage() {
    const navigate = useNavigate();
    const { socket, isConnected } = useSocket();
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null);

    // Load saved name
    useEffect(() => {
        const saved = localStorage.getItem('globalPlayerName') || localStorage.getItem('playerName');
        if (saved) setPlayerName(saved);
    }, []);

    const handleCreateClick = () => {
        if (!playerName.trim()) {
            setPendingAction('create');
            setShowNameModal(true);
        } else {
            createRoom();
        }
    };

    const handleJoinClick = () => {
        if (!playerName.trim()) {
            setPendingAction('join');
            setShowNameModal(true);
        } else {
            setShowJoinModal(true);
        }
    };

    const createRoom = () => {
        if (!socket || !playerName.trim()) return;
        setLoading(true);
        localStorage.setItem('globalPlayerName', playerName.trim());

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

    const handleConfirmName = () => {
        if (!playerName.trim()) return;
        localStorage.setItem('globalPlayerName', playerName.trim());
        setShowNameModal(false);

        if (pendingAction === 'create') {
            createRoom();
        } else if (pendingAction === 'join') {
            setShowJoinModal(true);
        }
        setPendingAction(null);
    };

    const handleJoinRoom = () => {
        if (!roomCode.trim()) return;
        localStorage.setItem('globalPlayerName', playerName.trim());
        setShowJoinModal(false);
        navigate(`/impostor-v2/lobby/${roomCode.toUpperCase()}`);
    };

    return (
        <div className={styles.container}>
            {/* Space Background */}
            <div className={styles.spaceBackground}>
                <div className={styles.stars} />
                <div className={styles.planet} />
            </div>

            <button className={styles.backButton} onClick={() => navigate('/menu')}>
                ← Menú
            </button>

            <div className={styles.connectionBadge}>
                <span className={isConnected ? styles.online : styles.offline}>
                    ● {isConnected ? 'Online' : 'Desconectado'}
                </span>
            </div>

            <div className={styles.content}>
                {/* Among Us Character */}
                <div className={styles.character}>
                    <div className={styles.bean} style={{ '--color': '#c51111' } as any}>
                        <div className={styles.visor} />
                        <div className={styles.backpack} />
                    </div>
                </div>

                <h1 className={styles.title}>IMPOSTOR</h1>
                <p className={styles.subtitle}>¿Quién no conoce la palabra secreta?</p>

                {playerName && (
                    <div className={styles.playerTag}>
                        Jugando como: <span>{playerName}</span>
                    </div>
                )}

                <div className={styles.buttons}>
                    <button
                        className={styles.createBtn}
                        onClick={handleCreateClick}
                        disabled={loading || !isConnected}
                    >
                        <span className={styles.btnIcon}>🚀</span>
                        <div>
                            <div className={styles.btnTitle}>CREAR SALA</div>
                            <div className={styles.btnSub}>Empieza una nueva partida</div>
                        </div>
                    </button>

                    <button
                        className={styles.joinBtn}
                        onClick={handleJoinClick}
                        disabled={loading || !isConnected}
                    >
                        <span className={styles.btnIcon}>🔗</span>
                        <div>
                            <div className={styles.btnTitle}>UNIRSE</div>
                            <div className={styles.btnSub}>Ingresa el código de la sala</div>
                        </div>
                    </button>
                </div>

                <div className={styles.rules}>
                    <h3>📋 ¿Cómo se juega?</h3>
                    <ul>
                        <li>Todos reciben un <strong>futbolista secreto</strong> excepto el impostor</li>
                        <li>Da <strong>pistas</strong> sobre tu futbolista sin revelar quién es</li>
                        <li><strong>Debate</strong> y descubre al impostor por sus pistas vagas</li>
                        <li><strong>Vota</strong> para eliminar al sospechoso</li>
                    </ul>
                </div>
            </div>

            {/* Name Modal */}
            {showNameModal && (
                <div className={styles.modalOverlay} onClick={() => setShowNameModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>👤 ¿Cuál es tu nombre?</h2>
                        <input
                            type="text"
                            className={styles.nameInput}
                            placeholder="Tu nombre de jugador"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleConfirmName()}
                            maxLength={15}
                            autoFocus
                        />
                        <div className={styles.modalBtns}>
                            <button className={styles.cancelBtn} onClick={() => setShowNameModal(false)}>
                                Cancelar
                            </button>
                            <button
                                className={styles.confirmBtn}
                                onClick={handleConfirmName}
                                disabled={!playerName.trim()}
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>🔗 Unirse a Sala</h2>
                        <input
                            type="text"
                            className={styles.codeInput}
                            placeholder="XXXX"
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value.toUpperCase())}
                            onKeyPress={e => e.key === 'Enter' && handleJoinRoom()}
                            maxLength={4}
                            autoFocus
                        />
                        <div className={styles.modalBtns}>
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
