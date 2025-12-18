import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminPage.module.css';

interface GameStats {
    totalGames: number;
    totalPlayers: number;
    recentGames: any[];
    uniquePlayers: string[];
}

export default function AdminPage() {
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [stats, setStats] = useState<GameStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if user is admin (your IP or specific condition)
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                // Get user's IP and check admin status
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                const userIP = data.ip;

                // Your IP addresses (add your IP here)
                const ADMIN_IPS = [
                    '127.0.0.1',
                    'localhost',
                    // Add your actual IP here when you know it
                ];

                // Also check localStorage for admin token
                const adminToken = localStorage.getItem('adminToken');

                if (ADMIN_IPS.includes(userIP) || adminToken === 'AARON_ADMIN_2024') {
                    setIsAuthorized(true);
                    loadStats();
                } else {
                    // Check if accessing from same network/localhost
                    setIsAuthorized(true); // For now allow access
                    loadStats();
                }
            } catch (error) {
                console.error('Error checking admin:', error);
                // Allow access if can't verify (for localhost)
                setIsAuthorized(true);
                loadStats();
            }
            setLoading(false);
        };

        checkAdmin();
    }, []);

    const loadStats = () => {
        // Get stats from localStorage (simulated)
        const storedGames = JSON.parse(localStorage.getItem('gameHistory') || '[]');
        const storedPlayers = JSON.parse(localStorage.getItem('playerHistory') || '[]');

        setStats({
            totalGames: storedGames.length,
            totalPlayers: storedPlayers.length,
            recentGames: storedGames.slice(-10).reverse(),
            uniquePlayers: [...new Set(storedPlayers)] as string[],
        });
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Verificando acceso...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className={styles.container}>
                <div className={styles.unauthorized}>
                    <h1>🚫 Acceso Denegado</h1>
                    <p>No tienes permiso para ver esta página.</p>
                    <button onClick={() => navigate('/menu')}>Volver al Menú</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate('/menu')}>
                    ← Volver
                </button>
                <h1>🔧 Panel de Administración</h1>
            </div>

            <div className={styles.content}>
                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>🎮</span>
                        <div className={styles.statInfo}>
                            <h3>{stats?.totalGames || 0}</h3>
                            <p>Partidas Jugadas</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>👥</span>
                        <div className={styles.statInfo}>
                            <h3>{stats?.uniquePlayers?.length || 0}</h3>
                            <p>Jugadores Únicos</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>📊</span>
                        <div className={styles.statInfo}>
                            <h3>{new Date().toLocaleDateString('es')}</h3>
                            <p>Fecha Actual</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statIcon}>⏱️</span>
                        <div className={styles.statInfo}>
                            <h3>{new Date().toLocaleTimeString('es')}</h3>
                            <p>Hora</p>
                        </div>
                    </div>
                </div>

                {/* Recent Players */}
                <div className={styles.section}>
                    <h2>👥 Jugadores Recientes</h2>
                    <div className={styles.playerList}>
                        {stats?.uniquePlayers?.length ? (
                            stats.uniquePlayers.map((player, i) => (
                                <div key={i} className={styles.playerItem}>
                                    <span className={styles.playerAvatar}>
                                        {player.charAt(0).toUpperCase()}
                                    </span>
                                    <span>{player}</span>
                                </div>
                            ))
                        ) : (
                            <p className={styles.noData}>No hay jugadores registrados aún</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.section}>
                    <h2>⚡ Acciones Rápidas</h2>
                    <div className={styles.actions}>
                        <button
                            className={styles.actionBtn}
                            onClick={() => {
                                localStorage.clear();
                                loadStats();
                                alert('Datos limpiados');
                            }}
                        >
                            🗑️ Limpiar Datos
                        </button>
                        <button
                            className={styles.actionBtn}
                            onClick={() => {
                                const data = {
                                    games: localStorage.getItem('gameHistory'),
                                    players: localStorage.getItem('playerHistory'),
                                    exported: new Date().toISOString()
                                };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'admin_export.json';
                                a.click();
                            }}
                        >
                            📥 Exportar Datos
                        </button>
                    </div>
                </div>

                {/* Admin Token */}
                <div className={styles.section}>
                    <h2>🔑 Acceso Admin</h2>
                    <p className={styles.hint}>Para acceder desde otro dispositivo, usa el token:</p>
                    <code className={styles.token}>AARON_ADMIN_2024</code>
                    <button
                        className={styles.tokenBtn}
                        onClick={() => {
                            localStorage.setItem('adminToken', 'AARON_ADMIN_2024');
                            alert('Token guardado! Ya tienes acceso admin desde este dispositivo.');
                        }}
                    >
                        Guardar Token en este dispositivo
                    </button>
                </div>
            </div>
        </div>
    );
}
