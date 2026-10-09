import type { Profile } from '../shared/types';

export type SoundCue = 'draw' | 'bank' | 'bust' | 'special' | 'hackathon' | 'win' | 'turn' | 'tick';
export const SOUNDTRACKS = {
  neon: {
    name: 'Synthwave',
    title: 'Midnight Circuit',
    style: 'Soft synths · steady groove',
    bpm: 104,
  },
  velvet: {
    name: 'Lounge',
    title: 'The After Hours',
    style: 'Warm keys · laid-back lounge',
    bpm: 82,
  },
  pop: {
    name: 'Disco',
    title: 'Pocketful of Sunshine',
    style: 'Playful plucks · easy disco',
    bpm: 112,
  },
};
export type MusicStyle = keyof typeof SOUNDTRACKS;
export type AudioSettings = {
  music: boolean;
  effects: boolean;
  volume: number;
  style: 'theme' | MusicStyle;
};
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  music: false,
  effects: false,
  volume: 0.35,
  style: 'theme',
};
export function resolveSoundtrack(
  style: AudioSettings['style'],
  appearance: Profile['appearance'],
): MusicStyle {
  return style === 'theme' ? (appearance === 'glow' ? 'neon' : appearance) : style;
}
export function readAudioSettings(): AudioSettings {
  try {
    const saved = JSON.parse(localStorage.getItem('jom-audio') ?? 'null');
    return {
      music: saved?.music === true,
      effects:
        typeof saved?.effects === 'boolean'
          ? saved.effects
          : localStorage.getItem('jom-sound') === 'true',
      volume:
        typeof saved?.volume === 'number' && Number.isFinite(saved.volume)
          ? Math.max(0, Math.min(1, saved.volume))
          : 0.35,
      style:
        saved?.style === 'neon' || saved?.style === 'velvet' || saved?.style === 'pop'
          ? saved.style
          : 'theme',
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const chords = {
  neon: [
    [57, 60, 64, 71],
    [53, 57, 60, 64],
    [48, 55, 59, 64],
    [55, 59, 62, 69],
  ],
  velvet: [
    [50, 57, 60, 64],
    [43, 53, 59, 64],
    [48, 55, 59, 62],
    [45, 55, 60, 64],
  ],
  pop: [
    [48, 55, 57, 64],
    [45, 55, 60, 64],
    [53, 57, 60, 67],
    [43, 55, 59, 65],
  ],
};

/** An original, locally synthesized score. One context and scheduler serve the whole app. */
export class GameAudio {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private notes = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;
  private next = 0;
  private step = 0;
  private visible = true;
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
  private soundtrack: MusicStyle = 'neon';

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      limiter.connect(this.context.destination);
      this.musicBus = this.context.createGain();
      this.effectsBus = this.context.createGain();
      this.musicBus.connect(limiter);
      this.effectsBus.connect(limiter);
      this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 613;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
    }
    const context = this.context;
    if (this.visible) await context.resume();
    if (this.context !== context) return false;
    this.sync();
    return context.state === 'running';
  }
  configure(settings: AudioSettings, appearance: Profile['appearance']) {
    const soundtrack = resolveSoundtrack(settings.style, appearance);
    if (soundtrack !== this.soundtrack) {
      this.stopMusic();
      this.soundtrack = soundtrack;
      this.step = 0;
    }
    this.settings = settings;
    this.sync();
  }
  async setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.stopMusic();
      await this.context?.suspend();
    } else if (this.context) {
      await this.context.resume();
      this.sync();
    }
  }
  private sync() {
    const ctx = this.context;
    if (!ctx || !this.musicBus || !this.effectsBus) return;
    this.musicBus.gain.setTargetAtTime(
      this.settings.music ? this.settings.volume * 0.6 : 0,
      ctx.currentTime,
      0.04,
    );
    this.effectsBus.gain.setTargetAtTime(this.settings.effects ? 0.28 : 0, ctx.currentTime, 0.015);
    if (this.settings.music && this.visible && ctx.state === 'running') {
      if (!this.timer) {
        this.next = ctx.currentTime + 0.06;
        this.timer = setInterval(() => this.schedule(), 25);
        this.schedule();
      }
    } else this.stopMusic();
  }
  private stopMusic() {
    clearInterval(this.timer);
    this.timer = undefined;
    for (const note of this.notes) {
      try {
        note.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.notes.clear();
  }
  private voice(
    midi: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    music = true,
    cutoff = 2600,
  ) {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.value = frequency(midi);
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect((music ? this.musicBus : this.effectsBus)!);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.014);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (music) this.notes.add(oscillator);
    oscillator.onended = () => {
      this.notes.delete(oscillator);
      oscillator.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
  private drum(kind: 'kick' | 'hat' | 'snare', start: number, volume: number) {
    const ctx = this.context!;
    const envelope = ctx.createGain();
    envelope.connect(this.musicBus!);
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + (kind === 'kick' ? 0.23 : 0.1));
    const source = kind === 'kick' ? ctx.createOscillator() : ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    if (source instanceof OscillatorNode) {
      source.frequency.setValueAtTime(130, start);
      source.frequency.exponentialRampToValueAtTime(43, start + 0.16);
      filter.type = 'lowpass';
      filter.frequency.value = 400;
    } else {
      source.buffer = this.noise;
      filter.type = 'highpass';
      filter.frequency.value = kind === 'hat' ? 7000 : 1700;
    }
    source.connect(filter);
    filter.connect(envelope);
    this.notes.add(source);
    source.onended = () => {
      this.notes.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    source.start(start);
    source.stop(start + 0.26);
  }
  private schedule() {
    const ctx = this.context!;
    const theme = this.soundtrack;
    const beat = 60 / SOUNDTRACKS[theme].bpm;
    // Recover from a sleeping event loop without queueing a burst of missed notes.
    if (this.next < ctx.currentTime) this.next = ctx.currentTime + 0.02;
    while (this.next < ctx.currentTime + 0.12) {
      const step = this.step % 16;
      const bar = Math.floor(this.step / 16) % 8;
      const chord = chords[theme][bar % 4];
      const time = this.next + (theme === 'velvet' && step % 2 ? beat * 0.045 : 0);
      if (step === 0 || step === 10) {
        chord.slice(1).forEach((note, i) => {
          this.voice(note, time + i * 0.014, beat * 2.6, 0.055, 'triangle');
          if (theme === 'velvet') this.voice(note + 12, time + i * 0.014, beat, 0.013, 'sine');
        });
      }
      if ([0, 6, 8, 14].includes(step))
        this.voice(chord[0] - 12 + (step === 14 ? 7 : 0), time, beat * 0.65, 0.23, 'sine');
      const melodySteps = bar % 2 ? [2, 5, 10, 14] : [2, 6, 11];
      if (melodySteps.includes(step)) {
        const note = chord[1 + ((Math.floor(step / 3) + bar) % 3)] + 12;
        this.voice(note, time, beat * 0.8, 0.05, theme === 'pop' ? 'triangle' : 'sine');
        this.voice(note, time + beat * 0.75, beat * 0.55, 0.012, 'sine');
      }
      if (step === 0 || step === 8 || (theme !== 'velvet' && step === 6))
        this.drum('kick', time, 0.32);
      if (step === 4 || step === 12) this.drum('snare', time, theme === 'velvet' ? 0.07 : 0.13);
      if (step % 2 === 0) this.drum('hat', time, step % 4 === 2 ? 0.09 : 0.04);
      this.next += beat / 4;
      this.step = (this.step + 1) % 128;
    }
  }
  play(cue: SoundCue) {
    if (!this.settings.effects || !this.visible || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    const notes: Record<SoundCue, number[]> = {
      draw: [76, 81],
      bank: [64, 71, 76],
      bust: [52, 45],
      special: [76, 83, 88],
      hackathon: [48, 55, 60, 67, 72, 84],
      win: [72, 76, 79, 84, 88],
      turn: [72, 79],
      tick: [91],
    };
    notes[cue].forEach((note, i) =>
      this.voice(
        note,
        now + i * (cue === 'hackathon' ? 0.13 : 0.075),
        cue === 'tick' ? 0.035 : cue === 'hackathon' ? 0.42 : 0.24,
        cue === 'tick' ? 0.2 : 0.17,
        'sine',
        false,
      ),
    );
  }
  dispose() {
    this.stopMusic();
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
