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
import ImpostorLobbyPage from './pages/ImpostorV2/ImpostorLobbyPage';
import ImpostorGamePage from './pages/ImpostorV2/ImpostorGamePage';
import AdminPage from './pages/AdminPage';
import MusicRadio from './components/MusicRadio';
import { APP_VERSION } from './config';

function App() {
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
                <Route path="/impostor-v2/lobby/:roomCode" element={<ImpostorLobbyPage />} />
                <Route path="/impostor-v2/game/:roomCode" element={<ImpostorGamePage />} />

                {/* Admin Panel */}
                <Route path="/admin" element={<AdminPage />} />

                {/* Redirect unknown routes to intro */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Components */}
            <MusicRadio />
        </BrowserRouter>
    );
}

export default App;

