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

    // Ascending cheerful tones (C5 -> E5 -> G5)
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.12);

      gainNode.gain.setValueAtTime(0, now + i * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + i * 0.12 + 0.15);

      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.15);
    });
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
