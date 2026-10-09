import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile } from '../shared/types';
import {
  GameAudio,
  readAudioSettings,
  resolveSoundtrack,
  type AudioSettings,
  type SoundCue,
} from './audio';

export function useGameAudio(appearance: Profile['appearance']) {
  const [settings, setSettings] = useState(readAudioSettings);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const engine = useRef<GameAudio | null>(null);
  const current = useRef({ settings, appearance });
  current.current = { settings, appearance };
  const unlock = useCallback(async () => {
    try {
      engine.current ??= new GameAudio();
      engine.current.configure(current.current.settings, current.current.appearance);
      setUnlocked(await engine.current.unlock());
      setError('');
    } catch {
      setError('Audio could not start. Try pressing play again.');
      setUnlocked(false);
    }
  }, []);
  useEffect(() => {
    engine.current?.configure(settings, appearance);
    try {
      localStorage.setItem('jom-audio', JSON.stringify(settings));
    } catch {
      /* Session-only preferences still work. */
    }
  }, [settings, appearance]);
  useEffect(() => {
    if (!settings.music && !settings.effects) return;
    const start = () => void unlock();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [settings.music, settings.effects, unlock]);
  useEffect(() => {
    const visibility = () => void engine.current?.setVisible(!document.hidden).catch(() => {});
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      engine.current?.dispose();
      engine.current = null;
    };
  }, []);
  const update = (patch: Partial<AudioSettings>) => {
    const next = { ...settings, ...patch };
    current.current = { settings: next, appearance };
    setSettings(next);
    engine.current?.configure(next, appearance);
    if (next.music || next.effects) void unlock();
  };
  const play = useCallback((cue: SoundCue) => engine.current?.play(cue), []);
  return {
    settings,
    update,
    play,
    unlocked,
    error,
    soundtrack: resolveSoundtrack(settings.style, appearance),
  };
}
