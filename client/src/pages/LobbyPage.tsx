import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import styles from './LobbyPage.module.css';

interface Player {
    id: string;
    socketId: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    avatarColor: string;
}

export default function LobbyPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [players, setPlayers] = useState<Player[]>([]);
    const [roomId, setRoomId] = useState<string>('');
    const [mode, setMode] = useState<string>('NORMAL');
    const [isHost, setIsHost] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(10);
    const [copied, setCopied] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        turnDuration: 30,
        discussionDuration: 60,
        votingDuration: 30,
        impostorCount: 1,
        anonymousVoting: false,
        confirmEjects: true
    });
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (!socket || !roomCode) return;

        const storedRoom = localStorage.getItem('currentRoom');
        if (storedRoom) {
            const roomData = JSON.parse(storedRoom);
            if (roomData.roomCode === roomCode) {
                setRoomId(roomData.roomId);
                setIsHost(true);
                setMaxPlayers(roomData.maxPlayers || 10);
                socket.emit('room:get-state', { roomCode });
                localStorage.removeItem('currentRoom');
            }
        }

        socket.on('room:state', (data) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMaxPlayers(data.maxPlayers || 10);
            setMode(data.mode || 'NORMAL');
        });

        socket.on('room:joined', (data) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMaxPlayers(data.maxPlayers || 10);
            setMode(data.mode || 'NORMAL');
        });

        socket.on('room:updated', (data) => {
            setPlayers(data.players);
            if (data.settings) setSettings(data.settings);
        });

        socket.on('room:settings-updated', (newSettings) => {
            setSettings(newSettings);
        });

        socket.on('game:started', (data: any) => {
            // Broadcast only - wait for game:your-role
        });

        socket.on('game:your-role' as any, (data: any) => {
            localStorage.setItem('currentGame', JSON.stringify({
                gameId: data.gameId,
                roomId: data.roomId,
                roomCode: roomCode, // Save roomCode for "Play Again"
                totalRounds: data.totalRounds,
                players: data.players,
                word: data.word,
                isImpostor: data.isImpostor,
                role: data.role,
                settings: settings // Save settings for GamePage
            }));
            navigate(`/game/${data.gameId}`);
        });

        socket.on('guesswho:start-selection', () => {
            navigate(`/guess-who/game`, { state: { roomId, mode: 'vsPlayer' } });
        });

        socket.on('room:error', (error) => {
            console.error('Room error:', error);
            if (error.code === 'ROOM_CLOSED' || error.code === 'ROOM_NOT_FOUND') {
                alert(error.message);
                navigate('/menu');
            }
        });

        return () => {
            socket.off('room:state');
            socket.off('room:joined');
            socket.off('room:updated');
            socket.off('game:started');
            socket.off('game:your-role');
            socket.off('guesswho:start-selection');
            socket.off('room:error');
        };
    }, [socket, navigate, roomCode, roomId]); // Added roomId to deps

    const handleReady = () => {
        if (!socket || !roomId) return;
        const newReadyState = !isReady;
        setIsReady(newReadyState);
        socket.emit('player:ready', { roomId, isReady: newReadyState });
    };

    const handleStartGame = () => {
        if (!socket || !roomId) return;

        if (mode === 'GUESS_WHO') {
            socket.emit('guesswho:init', { roomId });
        } else {
            socket.emit('game:start', { roomId });
        }
    };


    const handleCopyCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleUpdateSettings = (key: string, value: any) => {
        if (!isHost) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        socket?.emit('room:update-settings', { roomId, settings: newSettings });
    };

    const handleLeave = () => {
        if (socket && roomId) {
            socket.emit('room:leave', { roomId });
        }
        navigate('/menu');
    };

    const readyCount = players.filter(p => p.isReady || p.isHost).length;
    const allReady = readyCount >= players.length;
    const canStart = players.length >= 2; // Minimum for testing

    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.bgPattern} />

            {/* Header */}
            <header className={styles.header}>
                <div className={styles.backBtn} onClick={handleLeave}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                    <span>Salir</span>
                </div>

                <div className={styles.logo}>
                    <span className={styles.logoText}>AARON STUD<span className={styles.logoNum}>10</span>S</span>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.content}>
                    {/* Room Code Section */}
                    <section className={styles.codeSection}>
                        <div className={styles.headerRow}>
                            <h1 className={styles.title}>SALA DE ESPERA</h1>
                            {isHost && (
                                <button
                                    className={`${styles.settingsBtn} ${showSettings ? styles.active : ''}`}
                                    onClick={() => setShowSettings(!showSettings)}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    Configuración
                                </button>
                            )}
                        </div>

                        {showSettings && isHost && (
                            <div className={styles.settingsPanel}>
                                <div className={styles.settingsGroup}>
                                    <h3>⏱️ Tiempos</h3>
                                    <div className={styles.settingRow}>
                                        <label>Turno (Pistas)</label>
                                        <select value={settings.turnDuration} onChange={(e) => handleUpdateSettings('turnDuration', Number(e.target.value))}>
                                            <option value={15}>15s</option>
                                            <option value={30}>30s</option>
                                            <option value={45}>45s</option>
                                            <option value={60}>60s</option>
                                        </select>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <label>Discusión</label>
                                        <select value={settings.discussionDuration} onChange={(e) => handleUpdateSettings('discussionDuration', Number(e.target.value))}>
                                            <option value={30}>30s</option>
                                            <option value={60}>60s</option>
                                            <option value={90}>90s</option>
                                            <option value={120}>120s</option>
                                        </select>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <label>Votación</label>
                                        <select value={settings.votingDuration} onChange={(e) => handleUpdateSettings('votingDuration', Number(e.target.value))}>
                                            <option value={15}>15s</option>
                                            <option value={30}>30s</option>
                                            <option value={45}>45s</option>
                                            <option value={60}>60s</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.settingsGroup}>
                                    <h3>🎭 Roles</h3>
                                    <div className={styles.settingRow}>
                                        <label>Impostores</label>
                                        <select value={settings.impostorCount} onChange={(e) => handleUpdateSettings('impostorCount', Number(e.target.value))}>
                                            <option value={1}>1</option>
                                            <option value={2}>2</option>
                                            <option value={3}>3</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.settingsGroup}>
                                    <h3>⚙️ Mecánicas</h3>
                                    <div className={styles.settingRow}>
                                        <label>Voto Anónimo</label>
                                        <input
                                            type="checkbox"
                                            checked={settings.anonymousVoting}
                                            onChange={(e) => handleUpdateSettings('anonymousVoting', e.target.checked)}
                                        />
                                    </div>
                                    <div className={styles.settingRow}>
                                        <label>Confirmar Expulsiones</label>
                                        <input
                                            type="checkbox"
                                            checked={settings.confirmEjects}
                                            onChange={(e) => handleUpdateSettings('confirmEjects', e.target.checked)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className={styles.codeCard} onClick={handleCopyCode}>
                            <span className={styles.codeLabel}>CÓDIGO DE SALA</span>
                            <span className={styles.codeValue}>{roomCode}</span>
                            <span className={styles.copyHint}>
                                {copied ? 'Copiado' : 'Click para copiar'}
                            </span>
                        </div>

                        {/* Share Link Button */}
                        <button
                            style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1.5rem',
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                width: '100%'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                const shareUrl = `${window.location.origin}/join/${roomCode}`;
                                navigator.clipboard.writeText(shareUrl);
                                alert('¡Link copiado! Compártelo con tus amigos');
                            }}
                        >
                            🔗 Compartir Link de Invitación
                        </button>
                    </section>

                    {/* Players Grid */}
                    <section className={styles.playersSection}>
                        <div className={styles.sectionHeader}>
                            <h2>Jugadores</h2>
                            <span className={styles.counter}>{players.length}/{maxPlayers}</span>
                        </div>

                        <div className={styles.playersGrid}>
                            {players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`${styles.playerCard} ${player.isReady || player.isHost ? styles.ready : ''}`}
                                >
                                    <div
                                        className={styles.playerAvatar}
                                        style={{ backgroundColor: player.avatarColor }}
                                    >
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={styles.playerInfo}>
                                        <span className={styles.playerName}>
                                            {player.name}
                                            {player.isHost && (
                                                <span className={styles.hostBadge}>HOST</span>
                                            )}
                                        </span>
                                        <span className={styles.playerStatus}>
                                            {player.isHost ? 'Puede iniciar' : player.isReady ? 'Listo' : 'Esperando...'}
                                        </span>
                                    </div>
                                    {(player.isReady || player.isHost) && (
                                        <div className={styles.checkIcon}>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Empty slots */}
                            {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                                <div key={`empty-${i}`} className={styles.emptySlot}>
                                    <div className={styles.emptyAvatar}>
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                        </svg>
                                    </div>
                                    <span className={styles.emptyText}>Esperando...</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Actions */}
                    <section className={styles.actionsSection}>
                        {isHost ? (
                            <div className={styles.hostActions}>
                                <p className={styles.hint}>
                                    {!canStart
                                        ? `Esperando jugadores (mínimo 2)...`
                                        : !allReady
                                            ? `${readyCount}/${players.length} jugadores listos`
                                            : '¡Todos listos para jugar!'}
                                </p>
                                <button
                                    className={`${styles.startBtn} ${canStart ? styles.active : ''}`}
                                    onClick={handleStartGame}
                                    disabled={!canStart}
                                >
                                    <span>INICIAR PARTIDA</span>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div className={styles.playerActions}>
                                <button
                                    className={`${styles.readyBtn} ${isReady ? styles.isReady : ''}`}
                                    onClick={handleReady}
                                >
                                    {isReady ? (
                                        <>
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                            </svg>
                                            <span>ESTOY LISTO</span>
                                        </>
                                    ) : (
                                        <span>MARCAR LISTO</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Game Info */}
                    <section className={styles.infoSection}>
                        <h3>Información del Juego</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Modo</span>
                                <span className={styles.infoValue}>Normal</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Rondas</span>
                                <span className={styles.infoValue}>5 máx</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Pistas</span>
                                <span className={styles.infoValue}>90s</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Votación</span>
                                <span className={styles.infoValue}>30s</span>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
