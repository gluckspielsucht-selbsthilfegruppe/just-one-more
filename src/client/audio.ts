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
  western: {
    name: 'Western',
    title: 'Showdown at Dry Gulch',
    style: 'Twangy guitar · lonesome whistle · galloping hooves',
    bpm: 96,
  },
  halloween: {
    name: 'Spooky',
    title: 'Midnight at Hollow Manor',
    style: 'Creaky music box · haunted organ · wobbly theremin',
    bpm: 100,
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
  if (style !== 'theme') return style;
  return appearance === 'glow' ? 'neon' : appearance;
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
      style: Object.hasOwn(SOUNDTRACKS, saved?.style) ? saved.style : 'theme',
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
  western: [
    [45, 57, 60, 64],
    [43, 55, 59, 62],
    [41, 53, 57, 60],
    [40, 56, 59, 64],
  ],
  halloween: [
    [50, 62, 65, 69],
    [46, 58, 62, 65],
    [43, 55, 58, 62],
    [45, 57, 61, 64],
  ],
};
/** A lonesome whistled tune: [step, midi, length in sixteenths] for each of the eight bars. */
const whistle: [number, number, number][][] = [
  [
    [0, 81, 8],
    [8, 88, 6],
  ],
  [
    [0, 86, 4],
    [4, 84, 2],
    [6, 83, 2],
    [8, 79, 8],
  ],
  [
    [0, 81, 6],
    [6, 84, 2],
    [8, 89, 8],
  ],
  [
    [0, 88, 4],
    [4, 86, 2],
    [6, 83, 2],
    [8, 80, 8],
  ],
  [
    [0, 81, 4],
    [4, 84, 4],
    [8, 88, 4],
    [12, 93, 4],
  ],
  [
    [0, 91, 8],
    [8, 86, 8],
  ],
  [
    [0, 89, 4],
    [4, 88, 4],
    [8, 84, 8],
  ],
  [
    [0, 83, 4],
    [4, 86, 4],
    [8, 88, 8],
  ],
];
/** A tiptoeing music-box tune that hands over to a wailing theremin: [step, midi, sixteenths]. */
const hauntedTune: [number, number, number][][] = [
  [
    [0, 74, 2],
    [2, 77, 2],
    [4, 81, 4],
    [8, 80, 2],
    [10, 81, 2],
    [12, 77, 4],
  ],
  [
    [0, 74, 2],
    [2, 77, 2],
    [4, 82, 4],
    [8, 81, 2],
    [10, 79, 2],
    [12, 77, 4],
  ],
  [
    [0, 79, 2],
    [2, 82, 2],
    [4, 86, 4],
    [8, 85, 2],
    [10, 86, 2],
    [12, 82, 4],
  ],
  [
    [0, 85, 4],
    [4, 81, 4],
    [8, 76, 4],
    [12, 73, 4],
  ],
  [
    [0, 86, 8],
    [8, 81, 8],
  ],
  [
    [0, 82, 8],
    [8, 77, 8],
  ],
  [
    [0, 79, 4],
    [4, 82, 4],
    [8, 86, 4],
    [12, 88, 4],
  ],
  [
    [0, 85, 6],
    [6, 81, 2],
    [8, 73, 8],
  ],
];
/** Pizzicato bass steps above the root: root, fifth, octave, fifth and a sneaky tritone. */
const creepingBass: Record<number, number> = { 0: 0, 4: 7, 8: 12, 12: 7, 14: 6 };

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
  private effectsTheme: Profile['appearance'] = 'neon';
  private tock = false;

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
    this.effectsTheme = appearance;
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
  /** A filtered noise burst: gunshots, hoof clops, coin rattles and revolver clicks. */
  private burst(
    start: number,
    duration: number,
    volume: number,
    filterType: BiquadFilterType,
    from: number,
    to = from,
    music = false,
  ) {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = this.noise;
    // Long rumbles outlast the one-second noise buffer.
    source.loop = true;
    filter.type = filterType;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    envelope.gain.setValueAtTime(volume, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect((music ? this.musicBus : this.effectsBus)!);
    if (music) this.notes.add(source);
    source.onended = () => {
      this.notes.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    };
    source.start(start, (start * 7.3) % 0.5);
    source.stop(start + duration + 0.02);
  }
  /** A pitch glide with vibrato: whistled melodies, ricochets, theremins and ghostly wails. */
  private glide(
    from: number,
    to: number,
    start: number,
    duration: number,
    volume: number,
    music: boolean,
    vibrato = 5.5,
    attack = 0.05,
    depthRatio = 0.012,
  ) {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    const envelope = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      to,
      start + (music ? Math.min(duration, 0.09) : duration),
    );
    lfo.frequency.value = vibrato;
    depth.gain.value = to * depthRatio;
    lfo.connect(depth);
    depth.connect(oscillator.frequency);
    oscillator.connect(envelope);
    envelope.connect((music ? this.musicBus : this.effectsBus)!);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + attack);
    if (music) envelope.gain.setValueAtTime(volume, start + duration * 0.7);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (music) this.notes.add(oscillator).add(lfo);
    oscillator.onended = () => {
      this.notes.delete(oscillator);
      this.notes.delete(lfo);
      oscillator.disconnect();
      lfo.disconnect();
      depth.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    lfo.start(start);
    oscillator.stop(start + duration + 0.02);
    lfo.stop(start + duration + 0.02);
  }
  private gunshot(start: number, volume = 0.42) {
    // The crack, the boom, and two answers from the canyon walls.
    [0, 0.21, 0.47].forEach((delay, echo) => {
      const level = volume * [1, 0.28, 0.1][echo];
      this.burst(start + delay, 0.05, level * 1.1, 'highpass', 2400);
      this.burst(start + delay, 0.42, level * 0.95, 'lowpass', 5200, 180);
    });
    this.glide(150, 42, start, 0.2, volume * 0.6, false, 0, 0.004);
  }
  private ricochet(start: number) {
    this.glide(2900, 640, start, 0.55, 0.11, false, 9, 0.01);
  }
  private spurs(start: number) {
    [0, 0.06, 0.11, 0.19].forEach((delay, i) =>
      [96, 101, 105].forEach((note) =>
        this.voice(note - (i % 2) * 2, start + delay, 0.18, 0.045, 'sine', false, 9000),
      ),
    );
  }
  private westernCue(cue: SoundCue, now: number) {
    if (cue === 'draw') {
      this.burst(now, 0.08, 0.35, 'bandpass', 5200, 1400);
      this.voice(52, now + 0.02, 0.5, 0.16, 'sawtooth', false, 1500);
      this.voice(64, now + 0.04, 0.4, 0.06, 'sawtooth', false, 1700);
    } else if (cue === 'bank') {
      this.burst(now, 0.06, 0.2, 'highpass', 6000);
      [88, 95, 100].forEach((note, i) =>
        this.voice(note, now + 0.05 + i * 0.07, 0.6, 0.14, 'triangle', false, 9000),
      );
      this.burst(now + 0.12, 0.35, 0.1, 'bandpass', 7000, 4000);
    } else if (cue === 'bust') {
      this.gunshot(now);
      this.ricochet(now + 0.12);
    } else if (cue === 'special') {
      this.ricochet(now);
      this.spurs(now + 0.25);
    } else if (cue === 'win') {
      [0, 0.24, 0.48].forEach((delay) => this.gunshot(now + delay, 0.3));
      [69, 73, 76, 81].forEach((note, i) =>
        this.voice(note, now + 0.75 + i * 0.12, i === 3 ? 0.9 : 0.3, 0.15, 'sawtooth', false, 2200),
      );
    } else if (cue === 'turn') this.spurs(now);
    else if (cue === 'tick') {
      this.burst(now, 0.025, 0.25, 'highpass', 3500);
      this.burst(now + 0.03, 0.02, 0.15, 'bandpass', 2200);
    } else return false;
    return true;
  }
  /** A bell with slightly inharmonic partials: graveyard chimes and the midnight toll. */
  private bell(midi: number, start: number, duration: number, volume: number, music: boolean) {
    [0, 12, 15.2, 19, 24, 29.5].forEach((offset, i) =>
      this.voice(
        midi + offset,
        start,
        duration / (1 + i * 0.4),
        volume / (1 + i * 0.9),
        'sine',
        music,
        9000,
      ),
    );
  }
  private organ(notes: number[], start: number, duration: number, volume: number, music: boolean) {
    for (const note of notes) {
      this.voice(note, start, duration, volume, 'sawtooth', music, 1500);
      this.voice(note + 12, start, duration, volume * 0.45, 'square', music, 2100);
    }
  }
  private thunder(start: number) {
    this.burst(start, 0.12, 0.4, 'highpass', 2600);
    this.burst(start, 1.7, 0.55, 'lowpass', 1400, 55);
    this.burst(start + 0.3, 1.3, 0.32, 'lowpass', 520, 45);
  }
  private ghostWail(start: number) {
    // Ooooo… a falling, wobbling moan.
    this.glide(520, 980, start, 0.35, 0.09, false, 5, 0.1, 0.03);
    this.glide(980, 210, start + 0.32, 1.1, 0.12, false, 6.5, 0.02, 0.04);
  }
  private cackle(start: number, volume = 0.1) {
    // Hee-hee-hee! Quick, falling, wobbly yelps from under a pointy hat.
    [0, 0.1, 0.19, 0.27, 0.35, 0.42].forEach((delay, i) =>
      this.glide(1300 - i * 70, 860 - i * 60, start + delay, 0.08, volume, false, 26, 0.008, 0.05),
    );
  }
  private owl(start: number) {
    this.glide(430, 380, start, 0.24, 0.12, false, 0, 0.04);
    this.glide(450, 360, start + 0.36, 0.5, 0.12, false, 3, 0.06);
  }
  private bubbles(start: number) {
    [0, 0.07, 0.15, 0.21, 0.3].forEach((delay, i) =>
      this.glide(240 + i * 50, 640 + i * 110, start + delay, 0.07, 0.11, false, 0, 0.005),
    );
  }
  private halloweenCue(cue: SoundCue, now: number) {
    if (cue === 'draw') {
      // A ghostly whoosh and a plucked music-box note.
      this.burst(now, 0.34, 0.24, 'bandpass', 420, 3400);
      this.voice(81, now + 0.12, 0.55, 0.11, 'sine', false, 9000);
      this.voice(86, now + 0.2, 0.65, 0.06, 'triangle', false, 9000);
    } else if (cue === 'bank') {
      // The cauldron bubbles and a treat drops into the bag.
      this.bubbles(now);
      [74, 78, 81, 86].forEach((note, i) =>
        this.voice(note + 12, now + 0.32 + i * 0.07, 0.7, 0.1, 'triangle', false, 9000),
      );
    } else if (cue === 'bust') {
      this.thunder(now);
      this.organ([38, 50, 53, 56], now + 0.05, 1.6, 0.05, false);
      this.ghostWail(now + 0.2);
    } else if (cue === 'special') {
      this.cackle(now);
      this.glide(600, 2400, now + 0.5, 0.35, 0.06, false, 12, 0.01);
    } else if (cue === 'win') {
      // A pipe-organ flourish, Bach-style, resolving to a bright major chord and a bell.
      [81, 79, 81].forEach((note, i) =>
        this.organ([note, note - 12], now + i * 0.09, 0.16, 0.04, false),
      );
      [79, 77, 76, 74, 73, 74].forEach((note, i) =>
        this.organ([note, note - 12], now + 0.5 + i * 0.1, i === 5 ? 0.5 : 0.14, 0.04, false),
      );
      this.organ([50, 54, 57, 62], now + 1.15, 1.8, 0.035, false);
      this.bell(86, now + 1.15, 2.4, 0.1, false);
      this.cackle(now + 1.7, 0.07);
    } else if (cue === 'turn') this.owl(now);
    else if (cue === 'tick') {
      // Tick-tock, with a little rattle of bones.
      this.tock = !this.tock;
      this.burst(now, 0.03, 0.28, 'bandpass', this.tock ? 1800 : 2700);
      this.voice(this.tock ? 84 : 91, now, 0.07, 0.07, 'triangle', false, 9000);
    } else return false;
    return true;
  }
  private scheduleHalloween(time: number, step: number, bar: number, beat: number) {
    const chord = chords.halloween[bar % 4];
    // The grandfather clock in the hall keeps time.
    if (step % 4 === 0)
      this.burst(
        time,
        0.035,
        step % 8 === 0 ? 0.16 : 0.1,
        'bandpass',
        step % 8 === 0 ? 2600 : 1900,
        undefined,
        true,
      );
    const bass = creepingBass[step];
    if (bass !== undefined)
      this.voice(chord[0] - 12 + bass, time, beat * 0.45, 0.26, 'triangle', true, 900);
    if (step === 0) {
      this.drum('kick', time, 0.3);
      this.organ([chord[0], chord[0] + 7], time, beat * 3.8, 0.018, true);
    }
    if (step === 2 || step === 6 || step === 10 || step === 14)
      this.organ(chord.slice(1), time, beat * 0.4, 0.014, true);
    // Skeleton xylophone fills before every other bar line.
    if (bar % 2 === 1 && (step === 13 || step === 15))
      this.voice(step === 13 ? 96 : 91, time, 0.08, 0.05, 'triangle', true, 9000);
    if (step === 0 && bar === 0) this.bell(62, time, beat * 6, 0.07, true);
    for (const [at, note, length] of hauntedTune[bar]) {
      if (at !== step) continue;
      const duration = beat * (length / 4);
      if (bar < 4) {
        this.voice(note, time, duration * 1.4, 0.06, 'sine', true, 9000);
        this.voice(note + 12, time, duration * 0.5, 0.018, 'triangle', true, 9000);
      } else {
        // The theremin scoops into each note with a wide, wobbly vibrato.
        const pitch = frequency(note);
        this.glide(pitch * 0.82, pitch, time, duration * 0.95, 0.055, true, 6.5, 0.08, 0.025);
      }
    }
  }
  private scheduleWestern(time: number, step: number, bar: number, beat: number) {
    const chord = chords.western[bar % 4];
    // Galloping hooves: ta-ka-TUM, ta-ka-TUM.
    if (step % 4 !== 1)
      this.burst(
        time,
        0.05,
        step % 4 === 0 ? 0.32 : 0.16,
        'bandpass',
        step % 8 < 4 ? 1500 : 1050,
        700,
        true,
      );
    if (step % 8 === 0) this.voice(chord[0] - 12, time, beat * 1.4, 0.24, 'triangle', true, 700);
    if (step % 8 === 4) this.voice(chord[0] - 5, time, beat * 1.2, 0.17, 'triangle', true, 700);
    if (step === 2 || step === 6 || step === 10 || step === 14) {
      chord
        .slice(1)
        .forEach((note, i) =>
          this.voice(note, time + i * 0.018, beat * 0.9, 0.024, 'sawtooth', true, 1900),
        );
    }
    if (step === 0 && bar % 4 === 0) this.drum('kick', time, 0.36);
    for (const [at, note, length] of whistle[bar]) {
      if (at !== step) continue;
      const pitch = frequency(note);
      this.glide(pitch * 0.94, pitch, time, beat * (length / 4) * 0.95, 0.06, true);
      // A twangy guitar doubles the tune an octave down.
      this.voice(note - 12, time, beat * 0.7, 0.03, 'sawtooth', true, 2400);
    }
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
      if (theme === 'western' || theme === 'halloween') {
        if (theme === 'western') this.scheduleWestern(time, step, bar, beat);
        // A lopsided, tiptoeing swing keeps the haunt playful.
        else this.scheduleHalloween(time + (step % 2 ? beat * 0.07 : 0), step, bar, beat);
        this.next += beat / 4;
        this.step = (this.step + 1) % 128;
        continue;
      }
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
    if (this.effectsTheme === 'western' && this.westernCue(cue, now)) return;
    if (this.effectsTheme === 'halloween' && this.halloweenCue(cue, now)) return;
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
