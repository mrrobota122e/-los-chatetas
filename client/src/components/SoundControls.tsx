import { useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAdvancedSound } from '../hooks/useAdvancedSound';
import styles from './SoundControls.module.css';

export default function SoundControls() {
    const { isMuted, masterVolume, toggleMute, updateVolume } = useAdvancedSound();

    return (
        <div className={styles.container}>
            <button className={styles.muteBtn} onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <div className={styles.volumeSlider}>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={masterVolume}
                    onChange={(e) => updateVolume(parseFloat(e.target.value))}
                    disabled={isMuted}
                />
            </div>
        </div>
    );
}
