import { Headphones, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { useGameAudio } from '../useGameAudio';
import { SOUNDTRACKS, type AudioSettings } from '../audio';
import { Modal } from './ui';

export function AudioControls({
  audio,
  onClose,
}: {
  audio: ReturnType<typeof useGameAudio>;
  onClose: () => void;
}) {
  const { settings, update, unlocked, error } = audio;
  const track = SOUNDTRACKS[audio.soundtrack];
  const playing = settings.music && unlocked;
  return (
    <Modal
      title="Set the mood."
      subtitle="YOUR TABLE. YOUR SOUNDTRACK."
      onClose={onClose}
      className="audio-modal"
    >
      <label className="form-field">
        Music style
        <select
          value={settings.style}
          onChange={(e) => update({ style: e.target.value as AudioSettings['style'] })}
        >
          <option value="theme">Follow app theme</option>
          {Object.entries(SOUNDTRACKS).map(([id, { name }]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className={`record-player ${playing ? 'playing' : ''}`}>
        <div className="record-disc" aria-hidden="true">
          <div>
            <Headphones size={28} />
            <span>ONE MORE RECORDS</span>
          </div>
        </div>
        <div className="record-info">
          <span className="eyebrow">{playing ? 'NOW PLAYING' : 'ON THE TURNTABLE'}</span>
          <h3>{track.title}</h3>
          <p>{track.style}</p>
          <div className="music-equalizer" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
      </div>
      <button className="button primary full" onClick={() => update({ music: !playing })}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
        {playing ? 'Pause music' : 'Play background music'}
      </button>
      {settings.music && !unlocked && !error && (
        <p className="audio-note">Press play or interact with the page to start the music.</p>
      )}
      <label className="music-volume">
        <span>
          <Volume2 size={17} /> Music volume <output>{Math.round(settings.volume * 100)}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(settings.volume * 100)}
          aria-label="Music volume"
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
        />
      </label>
      <button
        className="audio-effects"
        aria-pressed={settings.effects}
        onClick={() => update({ effects: !settings.effects })}
      >
        <span>
          {settings.effects ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span>
            <strong>Game sound effects</strong>
            <small>Cards, banked points & the roulette wheel</small>
          </span>
        </span>
        <span className={`audio-switch ${settings.effects ? 'on' : ''}`} aria-hidden="true">
          <i />
        </span>
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="audio-note">
        Pick your own soundtrack or follow your app theme. Music pauses when you leave this tab.
        Your sound preferences stay on this device.
      </p>
    </Modal>
  );
}
