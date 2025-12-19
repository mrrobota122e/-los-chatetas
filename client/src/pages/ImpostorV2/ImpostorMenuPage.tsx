import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorMenuPage.module.css';

export default function ImpostorMenuPage() {
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateRoom = async () => {
        if (!playerName.trim() || !socket) return;

        setLoading(true);

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
        navigate(`/impostor-v2/lobby/${roomCode.toUpperCase()}`);
    };

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            <button
                className={styles.backButton}
                onClick={() => navigate('/menu')}
            >
                ← Volver
            </button>

            <div className={styles.content}>
                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <span className={styles.titleWord}>IMPOSTOR</span>
                        <span className={styles.titleSubtext}>Deducción Social 3D</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Descubre al impostor antes de que sea tarde
                    </p>
                </div>

                <div className={styles.menuCard + ' glass-strong'}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Tu Nombre</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Introduce tu nombre..."
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.divider}>
                        <span>O</span>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Código de Sala</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="XXXX"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            maxLength={4}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.buttonGroup}>
                        <button
                            className={styles.createButton + ' neon-border-blue'}
                            onClick={handleCreateRoom}
                            disabled={!playerName.trim() || loading}
                        >
                            {loading ? 'Creando...' : '🎮 Crear Partida'}
                        </button>

                        <button
                            className={styles.joinButton}
                            onClick={handleJoinRoom}
                            disabled={!playerName.trim() || !roomCode.trim() || loading}
                        >
                            🚀 Unirse
                        </button>
                    </div>
                </div>

                <div className={styles.infoPanel + ' glass'}>
                    <h3>📋 Cómo Jugar</h3>
                    <ul>
                        <li><strong>Asignación:</strong> Todos reciben un futbolista, excepto 1 impostor</li>
                        <li><strong>Pistas:</strong> Cada jugador da 1 pista por turno sobre su futbolista</li>
                        <li><strong>Discusión:</strong> Hablan libremente para descubrir al impostor</li>
                        <li><strong>Votación:</strong> Votan para eliminar a un sospechoso</li>
                        <li><strong>Victoria:</strong> Grupo gana eliminando al impostor, impostor gana sobreviviendo</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
