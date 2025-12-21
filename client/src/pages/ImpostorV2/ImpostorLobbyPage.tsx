import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import styles from './ImpostorLobbyPage.module.css';

interface Player {
    id: string;
    name: string;
    isReady: boolean;
    isHost: boolean;
    isBot?: boolean;
}

const BOT_NAMES = ['MbappéBot', 'MessiBot', 'HaalandBot', 'ViniBot', 'BellinghamBot', 'PedriBot', 'SakaBot'];
const BEAN_COLORS = ['#c51111', '#132ed1', '#117f2d', '#ed54ba', '#ef7d0d', '#f5f557', '#3f474e', '#d6e0f0'];

export default function ImpostorLobbyPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();

    const [players, setPlayers] = useState<Player[]>([]);
    const [roomId, setRoomId] = useState<string>('');
    const [isHost, setIsHost] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    const inviteLink = typeof window !== 'undefined'
        ? `${window.location.origin}/impostor-v2/join/${roomCode}`
        : '';

    useEffect(() => {
        if (!socket || !roomCode) return;
        const playerName = localStorage.getItem('globalPlayerName') || 'Jugador';
        socket.emit('room:join', { roomCode, playerName });

        socket.on('room:joined', (data) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMyPlayerId(socket.id || '');
            setLoading(false);
        });

        socket.on('room:state', (data) => {
            setRoomId(data.roomId);
            setPlayers(data.players);
            setIsHost(data.hostId === socket.id);
            setMyPlayerId(socket.id || '');
            setLoading(false);
        });

        socket.on('room:updated', (data) => setPlayers(data.players));
        socket.on('room:error', (error) => {
            alert(error.message);
            navigate('/impostor-v2/menu');
        });

        socket.on('impostor:state-changed', (data) => {
            if (data.state === 'ASSIGNMENT') {
                navigate(`/impostor-v2/game/${roomCode}`);
            }
        });

        return () => {
            socket.off('room:joined');
            socket.off('room:state');
            socket.off('room:updated');
            socket.off('room:error');
            socket.off('impostor:state-changed');
        };
    }, [socket, roomCode, navigate]);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            const input = document.createElement('input');
            input.value = inviteLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShareWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`¡Únete a mi sala de Impostor! 🎮\n${inviteLink}`)}`, '_blank');
    };

    const handleAddBots = () => {
        if (!socket || !roomId) return;
        const botsNeeded = Math.max(2, 4 - players.length);
        socket.emit('room:add-bots', { roomId, count: botsNeeded });

        const availableBots = BOT_NAMES.filter(name => !players.some(p => p.name === name));
        const newBots: Player[] = [];
        for (let i = 0; i < botsNeeded && i < availableBots.length; i++) {
            newBots.push({
                id: `bot-${Date.now()}-${i}`,
                name: availableBots[i],
                isReady: true,
                isHost: false,
                isBot: true
            });
        }
        if (newBots.length > 0) setPlayers(prev => [...prev, ...newBots]);
    };

    const handleStartGame = () => {
        if (players.length < 3) {
            alert('Se necesitan al menos 3 jugadores');
            return;
        }
        setCountdown(3);
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown === 0) {
            navigate(`/impostor-v2/game/${roomCode}`);
            return;
        }
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, navigate, roomCode]);

    const handleLeave = () => {
        if (socket && roomId) socket.emit('room:leave', { roomId });
        navigate('/impostor-v2/menu');
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.background} />
                <div className={styles.loadingScreen}>
                    <div className={styles.loadingBean} />
                    <p>Conectando...</p>
                    <div className={styles.loadingDots}><span /><span /><span /></div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.background} />

            {countdown !== null && (
                <div className={styles.countdownOverlay}>
                    <div className={styles.countdownNumber}>{countdown || '¡YA!'}</div>
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.roomCodeBox}>
                        <span className={styles.codeLabel}>SALA</span>
                        <span className={styles.codeValue}>{roomCode}</span>
                    </div>
                    <div className={styles.playerCounter}>👥 {players.length}/8</div>
                </div>
                <button className={styles.leaveBtn} onClick={handleLeave}>✕ Salir</button>
            </header>

            <main className={styles.mainContent}>
                <section className={styles.playersSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Jugadores</h2>
                        <span className={styles.liveIndicator}>🔴 EN VIVO</span>
                    </div>

                    <div className={styles.playersGrid}>
                        {players.map((player, index) => (
                            <div
                                key={player.id}
                                className={`${styles.playerCard} ${player.id === myPlayerId ? styles.isMe : ''} ${player.isBot ? styles.isBot : ''}`}
                                style={{ '--bean-color': BEAN_COLORS[index % BEAN_COLORS.length], '--delay': `${index * 0.1}s` } as any}
                            >
                                <div className={styles.cardBean}>
                                    <div className={styles.beanBody} />
                                    <div className={styles.beanVisor} />
                                </div>
                                <div className={styles.cardInfo}>
                                    <span className={styles.cardName}>{player.name}</span>
                                    <div className={styles.cardBadges}>
                                        {player.isHost && <span className={styles.badgeHost}>👑</span>}
                                        {player.isBot && <span className={styles.badgeBot}>🤖</span>}
                                        {player.id === myPlayerId && <span className={styles.badgeMe}>TÚ</span>}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className={styles.emptySlot}>
                                <span className={styles.emptyIcon}>?</span>
                                <span>Esperando...</span>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className={styles.sidebar}>
                    <div className={styles.inviteCard}>
                        <h3>🔗 Invitar Amigos</h3>
                        <div className={styles.linkBox}>
                            <input type="text" value={inviteLink} readOnly className={styles.linkInput} />
                            <button className={`${styles.copyBtn} ${copied ? styles.copied : ''}`} onClick={handleCopyLink}>
                                {copied ? '✓' : '📋'}
                            </button>
                        </div>
                        <div className={styles.shareRow}>
                            <button className={styles.waBtn} onClick={handleShareWhatsApp}>📱 WhatsApp</button>
                            <button className={styles.linkBtn} onClick={handleCopyLink}>🔗 Copiar Link</button>
                        </div>
                    </div>

                    <div className={styles.actionsCard}>
                        {isHost ? (
                            <>
                                <button className={styles.botsBtn} onClick={handleAddBots} disabled={players.length >= 8}>
                                    🤖 Añadir Bots
                                </button>
                                <button className={styles.startBtn} onClick={handleStartGame} disabled={players.length < 3}>
                                    {players.length < 3 ? `⏳ Faltan ${3 - players.length}` : '🚀 INICIAR'}
                                </button>
                            </>
                        ) : (
                            <div className={styles.waitingHost}>⏳ Esperando al host...</div>
                        )}
                    </div>

                    <div className={styles.rulesCard}>
                        <h3>📖 Reglas</h3>
                        <ul>
                            <li>🎯 Recibe un futbolista secreto</li>
                            <li>💬 Da pistas sin revelar el nombre</li>
                            <li>🕵️ El impostor NO conoce la palabra</li>
                            <li>🗳️ ¡Vota para expulsarlo!</li>
                        </ul>
                    </div>
                </aside>
            </main>

            <footer className={styles.footer}>
                <span>v3.0.0 © AARON STUD10S</span>
            </footer>
        </div>
    );
}
