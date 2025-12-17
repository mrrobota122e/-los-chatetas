// Google Analytics integration
declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        dataLayer?: any[];
    }
}

export const GA_TRACKING_ID = import.meta.env.VITE_GA_ID || '';

// Initialize GA
export const initGA = () => {
    if (!GA_TRACKING_ID) {
        console.warn('Google Analytics ID not configured');
        return;
    }

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer?.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_TRACKING_ID, {
        send_page_view: false // We'll send manually
    });
};

// Track page view
export const trackPageView = (path: string) => {
    if (!window.gtag) return;

    window.gtag('event', 'page_view', {
        page_path: path
    });
};

// Track events
export const trackEvent = (
    action: string,
    category: string,
    label?: string,
    value?: number
) => {
    if (!window.gtag) return;

    window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
    });
};

// Game-specific events
export const trackGameEvent = {
    // Los Chatetas
    createRoom: () => trackEvent('create_room', 'chatetas'),
    joinRoom: () => trackEvent('join_room', 'chatetas'),
    startGame: (playerCount: number) => trackEvent('start_game', 'chatetas', undefined, playerCount),
    endGame: (winner: 'impostor' | 'innocents', duration: number) =>
        trackEvent('end_game', 'chatetas', winner, Math.round(duration / 1000)),
    usePowerUp: (powerUp: string) => trackEvent('use_powerup', 'chatetas', powerUp),
    selectMode: (mode: string) => trackEvent('select_mode', 'chatetas', mode),

    // Guess Who
    startGuessWho: (mode: 'ai' | 'player') => trackEvent('start_game', 'guess_who', mode),
    askQuestion: () => trackEvent('ask_question', 'guess_who'),
    makeGuess: (correct: boolean) => trackEvent('make_guess', 'guess_who', correct ? 'correct' : 'incorrect'),
    eliminatePlayer: () => trackEvent('eliminate_player', 'guess_who'),

    // UI
    changeTheme: (theme: string) => trackEvent('change_theme', 'ui', theme),
    changeAvatar: () => trackEvent('change_avatar', 'ui'),
    shareRoom: (platform: string) => trackEvent('share', 'social', platform),
    scanQR: () => trackEvent('scan_qr', 'social'),

    // PWA
    install: () => trackEvent('install', 'pwa'),
    offline: () => trackEvent('offline_mode', 'pwa')
};
