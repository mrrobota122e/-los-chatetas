import { useState } from 'react';
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
import ImpostorMenuPage from './pages/ImpostorMenuPage';
import ImpostorGamePage from './pages/ImpostorGame/ImpostorGamePage';
import AdminPage from './pages/AdminPage';
import MusicRadio from './components/MusicRadio';
import { APP_VERSION } from './config';

function App() {
    const [isLoading, setIsLoading] = useState(true);

    if (isLoading) {
        return <LoadingScreen onComplete={() => setIsLoading(false)} />;
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

                {/* Impostor Routes */}
                <Route path="/impostor/menu" element={<ImpostorMenuPage />} />
                <Route path="/impostor/game/:roomCode" element={<ImpostorGamePage />} />

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
