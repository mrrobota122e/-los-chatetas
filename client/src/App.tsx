import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import IntroPage from './pages/IntroPage';
import MenuPage from './pages/MenuPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';
import GuessWhoMenuPage from './pages/guessWho/GuessWhoMenuPage';
import GuessWhoGamePage from './pages/guessWho/GuessWhoGamePage';
import GuessWhoLobbyPage from './pages/guessWho/GuessWhoLobbyPage';
import ImpostorMenuPage from './pages/ImpostorV2/ImpostorMenuPage';
import ImpostorGamePage from './pages/ImpostorV2/ImpostorGamePage';
import AdminPage from './pages/AdminPage';
import MusicRadio from './components/MusicRadio';
import { APP_VERSION } from './config';

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('');

    // Version Check Polling
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch(`/version.json?t=${Date.now()}`);
                const data = await response.json();
                if (data.version !== APP_VERSION) {
                    console.log(`🆕 Update found: ${data.version} (Current: ${APP_VERSION})`);
                    setIsUpdating(true);
                    setUpdateStatus('Detectando nueva versión...');

                    // Simulate update process for UX
                    setTimeout(() => setUpdateStatus('Descargando actualización...'), 1000);
                    setTimeout(() => setUpdateStatus('Instalando mejoras...'), 2500);
                    setTimeout(() => setUpdateStatus('Reiniciando...'), 4000);

                    setTimeout(() => {
                        window.location.reload();
                    }, 4500);
                }
            } catch (e) {
                console.error('Version check failed:', e);
            }
        };

        // Check immediately and then every 15 seconds
        checkVersion();
        const interval = setInterval(checkVersion, 15000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return <LoadingScreen onComplete={() => setIsLoading(false)} />;
    }

    if (isUpdating) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: '#0f0f23', color: 'white', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px', animation: 'spin 2s infinite linear' }}>🔄</div>
                <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>ACTUALIZANDO</h1>
                <p style={{ fontSize: '1.2rem', color: '#00d9ff' }}>{updateStatus}</p>
                <div style={{
                    width: '300px', height: '6px', background: '#333', borderRadius: '3px',
                    marginTop: '20px', overflow: 'hidden'
                }}>
                    <div style={{
                        width: '100%', height: '100%', background: '#00d9ff',
                        animation: 'progress 4s ease-in-out'
                    }} />
                </div>
                <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                    @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
                `}</style>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                {/* Intro page */}
                <Route path="/" element={<IntroPage />} />

                {/* Los Chatetas routes */}
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/lobby/:roomCode" element={<LobbyPage />} />
                <Route path="/join/:roomCode" element={<LobbyPage />} />
                <Route path="/game/:roomCode" element={<GamePage />} />
                <Route path="/results/:roomCode" element={<ResultsPage />} />

                {/* Guess Who routes */}
                <Route path="/guess-who/menu" element={<GuessWhoMenuPage />} />
                <Route path="/guess-who/lobby/:roomCode" element={<GuessWhoLobbyPage />} />
                <Route path="/guess-who/join/:roomCode" element={<GuessWhoLobbyPage />} />
                <Route path="/guess-who/game" element={<GuessWhoGamePage />} />

                {/* Impostor V2 routes */}
                <Route path="/impostor-v2/menu" element={<ImpostorMenuPage />} />
                <Route path="/impostor-v2/game/:roomCode" element={<ImpostorGamePage />} />

                {/* Admin Panel */}
                <Route path="/admin" element={<AdminPage />} />

                {/* Redirect unknown routes to intro */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Components */}
            <MusicRadio />

            {/* Version Footer */}
            <div style={{
                position: 'fixed',
                bottom: '10px',
                left: '10px',
                color: 'rgba(255,255,255,0.3)',
                fontSize: '11px',
                fontFamily: 'Arial, sans-serif',
                zIndex: 999,
            }}>
                v{APP_VERSION} © AARON STUD10S
            </div>
        </BrowserRouter>
    );
}

export default App;
