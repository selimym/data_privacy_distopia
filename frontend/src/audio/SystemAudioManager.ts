/**
 * SystemAudioManager - Audio for The System mode
 *
 * Uses Web Audio API to generate procedural sounds that reinforce
 * the cold, oppressive atmosphere of surveillance work.
 *
 * All sounds are generated - no external audio files required.
 */

type SoundType =
  | 'ambient'
  | 'select_citizen'
  | 'flag_submit'
  | 'warning_alert'
  | 'message_open'
  | 'decision_tick'
  | 'directive_new'
  | 'compliance_warning'
  | 'review_initiated'
  | 'keyboard_typing'
  | 'notification_soft'
  | 'ending_compliant'
  | 'ending_suspended'
  | 'ending_revelation';

interface AmbientState {
  isPlaying: boolean;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  intervalId: number | null;
}

export class SystemAudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientState: AmbientState = {
    isPlaying: false,
    oscillators: [],
    gainNodes: [],
    intervalId: null,
  };
  private enabled: boolean = true;
  private masterVolume: number = 0.5;
  private weekNumber: number = 1;

  constructor() {
    // AudioContext is created on first user interaction
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  public init(): boolean {
    if (this.audioContext) return true;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      return true;
    } catch (e) {
      console.warn('SystemAudioManager: Web Audio API not supported', e);
      return false;
    }
  }

  /**
   * Set the current week number (affects audio tension)
   */
  public setWeek(week: number) {
    this.weekNumber = Math.max(1, Math.min(6, week));
  }

  /**
   * Enable or disable all audio
   */
  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAmbient();
    }
  }

  /**
   * Set master volume (0-1)
   */
  public setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Play a sound effect
   */
  public play(sound: SoundType) {
    if (!this.enabled || !this.init()) return;

    switch (sound) {
      case 'select_citizen':
        this.playClinicalBeep();
        break;
      case 'flag_submit':
        this.playFlagSubmit();
        break;
      case 'warning_alert':
        this.playWarningAlert();
        break;
      case 'message_open':
        this.playMessageOpen();
        break;
      case 'decision_tick':
        this.playDecisionTick();
        break;
      case 'directive_new':
        this.playDirectiveNew();
        break;
      case 'compliance_warning':
        this.playComplianceWarning();
        break;
      case 'review_initiated':
        this.playReviewInitiated();
        break;
      case 'keyboard_typing':
        this.playKeyboardTyping();
        break;
      case 'notification_soft':
        this.playNotificationSoft();
        break;
      case 'ending_compliant':
        this.playEndingCompliant();
        break;
      case 'ending_suspended':
        this.playEndingSuspended();
        break;
      case 'ending_revelation':
        this.playEndingRevelation();
        break;
    }
  }

  /**
   * Start ambient drone (server room + office atmosphere)
   */
  public startAmbient() {
    if (!this.enabled || !this.init() || this.ambientState.isPlaying) return;
    if (!this.audioContext || !this.masterGain) return;

    this.ambientState.isPlaying = true;

    // Base drone frequencies (low hum)
    const baseFreqs = [55, 82.5, 110]; // A1, E2, A2

    baseFreqs.forEach((freq) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.value = 0.03 + (this.weekNumber - 1) * 0.005; // Slightly louder each week

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();

      this.ambientState.oscillators.push(osc);
      this.ambientState.gainNodes.push(gain);
    });

    // Add subtle noise (server hum)
    this.addAmbientNoise();

    // Add periodic data sounds
    this.ambientState.intervalId = window.setInterval(() => {
      if (Math.random() < 0.3) {
        this.playDataBlip();
      }
    }, 2000);
  }

  /**
   * Stop ambient drone
   */
  public stopAmbient() {
    if (!this.ambientState.isPlaying) return;

    this.ambientState.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });

    if (this.ambientState.intervalId) {
      clearInterval(this.ambientState.intervalId);
    }

    this.ambientState = {
      isPlaying: false,
      oscillators: [],
      gainNodes: [],
      intervalId: null,
    };
  }

  /**
   * Cleanup resources
   */
  public destroy() {
    this.stopAmbient();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // === Sound Generation Methods ===

  private addAmbientNoise() {
    if (!this.audioContext || !this.masterGain) return;

    // Create filtered noise for server room ambiance
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Low-pass filter to create rumble
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.audioContext.createGain();
    gain.gain.value = 0.02;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noiseSource.start();

    this.ambientState.oscillators.push(noiseSource as any);
    this.ambientState.gainNodes.push(gain);
  }

  private playDataBlip() {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800 + Math.random() * 400;

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playClinicalBeep() {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880; // A5 - clinical, medical-ish

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playFlagSubmit() {
    if (!this.audioContext || !this.masterGain) return;

    // Two-tone confirmation with slight ominous undertone
    const freqs = [523.25, 659.25]; // C5, E5
    const now = this.audioContext.currentTime;

    freqs.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    // Add low undertone
    const lowOsc = this.audioContext.createOscillator();
    const lowGain = this.audioContext.createGain();

    lowOsc.type = 'sine';
    lowOsc.frequency.value = 110; // A2 - ominous

    lowGain.gain.setValueAtTime(0, now);
    lowGain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    lowOsc.connect(lowGain);
    lowGain.connect(this.masterGain);

    lowOsc.start(now);
    lowOsc.stop(now + 0.5);
  }

  private playWarningAlert() {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Two-tone warning (alternating)
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 800 : 600;

      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  }

  private playMessageOpen() {
    if (!this.audioContext || !this.masterGain) return;

    // Slightly invasive, prying sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 600;

    const now = this.audioContext.currentTime;

    // Frequency sweep down (like opening something private)
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playDecisionTick() {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playDirectiveNew() {
    if (!this.audioContext || !this.masterGain) return;

    // Official, authoritative notification
    const now = this.audioContext.currentTime;
    const freqs = [392, 523.25, 659.25]; // G4, C5, E5 - fanfare-ish

    freqs.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  private playComplianceWarning() {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Descending tones (things are getting worse)
    const freqs = [600, 500, 400];

    freqs.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const startTime = now + i * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      // Low-pass to reduce harshness
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  private playReviewInitiated() {
    if (!this.audioContext || !this.masterGain) return;

    // Alarm-like, you're in trouble
    const now = this.audioContext.currentTime;

    for (let i = 0; i < 5; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'square';
      osc.frequency.value = 300 + (i % 2) * 150;

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.08);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.1);

      // Filter
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.12);
    }
  }

  private playKeyboardTyping() {
    if (!this.audioContext || !this.masterGain) return;

    // Random keyboard click sounds
    const numClicks = 3 + Math.floor(Math.random() * 4);
    const now = this.audioContext.currentTime;

    for (let i = 0; i < numClicks; i++) {
      const noise = this.createNoiseBuffer(0.03);
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noise;

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000 + Math.random() * 2000;

      const gain = this.audioContext.createGain();
      const startTime = now + i * (0.05 + Math.random() * 0.08);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(startTime);
    }
  }

  private playNotificationSoft() {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 1046.5; // C6 - high, soft ping

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playEndingCompliant() {
    if (!this.audioContext || !this.masterGain) return;

    // Hollow "success" - major chord but with dissonance
    const now = this.audioContext.currentTime;
    const freqs = [261.63, 329.63, 392, 466.16]; // C4, E4, G4, Bb4 (major with 7th - tension)

    freqs.forEach((freq) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.08, now + 2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 4);
    });
  }

  private playEndingSuspended() {
    if (!this.audioContext || !this.masterGain) return;

    // Ominous, closing in
    const now = this.audioContext.currentTime;
    const baseFreq = 110; // A2

    // Descending, ominous drone
    for (let i = 0; i < 3; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      const startFreq = baseFreq * (3 - i * 0.3);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 0.7, now + 3);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.06, now + 2.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 3);
    }
  }

  private playEndingRevelation() {
    if (!this.audioContext || !this.masterGain) return;

    // Somber, reflective - simple minor progression
    const now = this.audioContext.currentTime;
    const chords = [
      [220, 261.63, 329.63], // Am
      [196, 246.94, 293.66], // G
      [174.61, 220, 261.63], // F
      [164.81, 196, 246.94], // E
    ];

    chords.forEach((chord, chordIndex) => {
      const startTime = now + chordIndex * 1.5;

      chord.forEach((freq) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 0.2);
        gain.gain.linearRampToValueAtTime(0.06, startTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 1.5);
      });
    });
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const bufferSize = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

// Singleton instance
let instance: SystemAudioManager | null = null;

export function getSystemAudioManager(): SystemAudioManager {
  if (!instance) {
    instance = new SystemAudioManager();
  }
  return instance;
}
