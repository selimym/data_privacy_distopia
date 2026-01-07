/**
 * AudioManager - Manages game audio (music and sound effects)
 *
 * Usage:
 * - Call loadAudio() in PreloadScene to load sound files
 * - Call playAmbient() to play background music
 * - Call playSFX() to play sound effects
 * - Use setVolume() to adjust master volume
 */

export class AudioManager {
  private scene: Phaser.Scene;
  private ambientSound: Phaser.Sound.BaseSound | null = null;
  private masterVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load audio assets in PreloadScene
   *
   * Example:
   * this.load.audio('ambient-normal', '/assets/audio/ambient-normal.mp3');
   * this.load.audio('ambient-tense', '/assets/audio/ambient-tense.mp3');
   * this.load.audio('click', '/assets/audio/click.mp3');
   */
  static loadAudio(_scene: Phaser.Scene) {
    // Placeholder - add actual audio files when available
    // _scene.load.audio('ambient-normal', '/assets/audio/ambient-normal.mp3');
    // _scene.load.audio('ambient-tense', '/assets/audio/ambient-tense.mp3');
    // _scene.load.audio('ambient-sad', '/assets/audio/ambient-sad.mp3');
    // _scene.load.audio('click', '/assets/audio/click.mp3');
    // _scene.load.audio('panel-open', '/assets/audio/panel-open.mp3');
    // _scene.load.audio('alert', '/assets/audio/alert.mp3');
    console.log('AudioManager: Ready to load audio assets (none configured yet)');
  }

  /**
   * Play ambient background music
   * @param key - Sound key (e.g., 'ambient-normal', 'ambient-tense')
   * @param fadeDuration - Duration of fade transition in ms (default: 1000)
   */
  playAmbient(key: string, fadeDuration: number = 1000) {
    // Check if sound exists
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`AudioManager: Sound '${key}' not loaded`);
      return;
    }

    // Fade out current ambient sound if playing
    if (this.ambientSound && this.ambientSound.isPlaying) {
      this.scene.tweens.add({
        targets: this.ambientSound,
        volume: 0,
        duration: fadeDuration,
        onComplete: () => {
          this.ambientSound?.stop();
          this.startNewAmbient(key, fadeDuration);
        }
      });
    } else {
      this.startNewAmbient(key, fadeDuration);
    }
  }

  /**
   * Start playing a new ambient track
   */
  private startNewAmbient(key: string, fadeDuration: number) {
    this.ambientSound = this.scene.sound.add(key, {
      loop: true,
      volume: 0
    });

    this.ambientSound.play();

    // Fade in
    this.scene.tweens.add({
      targets: this.ambientSound,
      volume: this.musicVolume * this.masterVolume,
      duration: fadeDuration
    });
  }

  /**
   * Play a sound effect
   * @param key - Sound effect key (e.g., 'click', 'panel-open')
   * @param volumeModifier - Optional volume multiplier (default: 1.0)
   */
  playSFX(key: string, volumeModifier: number = 1.0) {
    // Check if sound exists
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`AudioManager: Sound '${key}' not loaded`);
      return;
    }

    const volume = this.sfxVolume * this.masterVolume * volumeModifier;
    this.scene.sound.play(key, { volume });
  }

  /**
   * Stop ambient music
   * @param fadeDuration - Duration of fade out in ms (default: 500)
   */
  stopAmbient(fadeDuration: number = 500) {
    if (!this.ambientSound) return;

    if (fadeDuration > 0) {
      this.scene.tweens.add({
        targets: this.ambientSound,
        volume: 0,
        duration: fadeDuration,
        onComplete: () => {
          this.ambientSound?.stop();
          this.ambientSound = null;
        }
      });
    } else {
      this.ambientSound.stop();
      this.ambientSound = null;
    }
  }

  /**
   * Set master volume (affects all sounds)
   * @param volume - Volume level (0.0 to 1.0)
   */
  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Update ambient sound if playing
    if (this.ambientSound && this.ambientSound.isPlaying) {
      (this.ambientSound as any).setVolume(this.musicVolume * this.masterVolume);
    }
  }

  /**
   * Set music volume
   * @param volume - Volume level (0.0 to 1.0)
   */
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    // Update ambient sound if playing
    if (this.ambientSound && this.ambientSound.isPlaying) {
      (this.ambientSound as any).setVolume(this.musicVolume * this.masterVolume);
    }
  }

  /**
   * Set sound effects volume
   * @param volume - Volume level (0.0 to 1.0)
   */
  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute all sounds
   */
  mute() {
    this.scene.sound.mute = true;
  }

  /**
   * Unmute all sounds
   */
  unmute() {
    this.scene.sound.mute = false;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.ambientSound) {
      this.ambientSound.stop();
      this.ambientSound = null;
    }
  }
}
