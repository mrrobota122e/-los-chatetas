import { FC } from 'react';
import { motion } from 'framer-motion';
import styles from './ThemeSwitcher.module.css';

export type Theme = 'default' | 'neon' | 'cyberpunk' | 'retro' | 'minimal';

interface ThemeSwitcherProps {
    currentTheme: Theme;
    onThemeChange: (theme: Theme) => void;
}

const THEMES = [
    {
        id: 'default' as Theme,
        name: 'Default',
        colors: ['#7b2ff7', '#00d9ff'],
        preview: 'linear-gradient(135deg, #7b2ff7 0%, #00d9ff 100%)'
    },
    {
        id: 'neon' as Theme,
        name: 'Neón',
        colors: ['#ff006e', '#00f5ff'],
        preview: 'linear-gradient(135deg, #ff006e 0%, #00f5ff 100%)'
    },
    {
        id: 'cyberpunk' as Theme,
        name: 'Cyberpunk',
        colors: ['#fcee21', '#ff00ff'],
        preview: 'linear-gradient(135deg, #fcee21 0%, #ff00ff 100%)'
    },
    {
        id: 'retro' as Theme,
        name: 'Retro',
        colors: ['#ff6b35', '#f7931e'],
        preview: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)'
    },
    {
        id: 'minimal' as Theme,
        name: 'Minimal',
        colors: ['#000000', '#ffffff'],
        preview: 'linear-gradient(135deg, #000000 0%, #ffffff 100%)'
    }
];

const ThemeSwitcher: FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
    return (
        <div className={styles.container}>
            <h4 className={styles.title}>Tema de Interfaz</h4>
            <div className={styles.themesGrid}>
                {THEMES.map((theme) => (
                    <motion.button
                        key={theme.id}
                        className={`${styles.themeBtn} ${currentTheme === theme.id ? styles.active : ''}`}
                        onClick={() => onThemeChange(theme.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div
                            className={styles.preview}
                            style={{ background: theme.preview }}
                        />
                        <span className={styles.themeName}>{theme.name}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default ThemeSwitcher;
