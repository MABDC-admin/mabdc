import { useCallback, useRef } from 'react';

type SoundType = 'check-in' | 'check-out' | 'error' | 'late';

export const useScannerSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Fade in and out for smoother sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, [getAudioContext]);

  const playCheckInSound = useCallback(() => {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;

    // Melodic "Ding-Dong" / "Ta-da" sound - warm and pleasing
    // First note: G5 (higher, bright "ding")
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now); // G5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.15, now + 0.2);
    gain1.gain.linearRampToValueAtTime(0, now + 0.4);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second note: E5 (lower, warm "dong") - slight delay for the pleasant cascade
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.1, now + 0.45);
    gain2.gain.linearRampToValueAtTime(0, now + 0.7);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);

    // Soft harmonic overlay for richness (octave above first note)
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.connect(gain3);
    gain3.connect(audioContext.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1568, now); // G6 (octave above G5)
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain3.gain.exponentialRampToValueAtTime(0.02, now + 0.25);
    gain3.gain.linearRampToValueAtTime(0, now + 0.35);
    osc3.start(now);
    osc3.stop(now + 0.35);
  }, [getAudioContext]);

  const playCheckOutSound = useCallback(() => {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;

    // Descending gentle tones (G5 -> E5 -> C5)
    [783.99, 659.25, 523.25].forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.12);

      gainNode.gain.setValueAtTime(0, now + i * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.18);

      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.18);
    });
  }, [getAudioContext]);

  const playLateSound = useCallback(() => {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;

    // Two-tone warning sound (slightly lower, with a cautionary feel)
    [440, 349.23, 440].forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.15);

      gainNode.gain.setValueAtTime(0, now + i * 0.15);
      gainNode.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.12);

      oscillator.start(now + i * 0.15);
      oscillator.stop(now + i * 0.15 + 0.12);
    });
  }, [getAudioContext]);

  const playErrorSound = useCallback(() => {
    const audioContext = getAudioContext();
    const now = audioContext.currentTime;

    // Two low buzzer tones
    [200, 150].forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.2);

      gainNode.gain.setValueAtTime(0, now + i * 0.2);
      gainNode.gain.linearRampToValueAtTime(0.15, now + i * 0.2 + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.2 + 0.18);

      oscillator.start(now + i * 0.2);
      oscillator.stop(now + i * 0.2 + 0.18);
    });
  }, [getAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case 'check-in':
        playCheckInSound();
        break;
      case 'check-out':
        playCheckOutSound();
        break;
      case 'late':
        playLateSound();
        break;
      case 'error':
        playErrorSound();
        break;
    }
  }, [playCheckInSound, playCheckOutSound, playLateSound, playErrorSound]);

  return { playSound };
};
