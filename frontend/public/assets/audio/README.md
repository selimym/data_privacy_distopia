# Audio Assets

This directory contains audio files for the game.

## Recommended Audio Files

### Ambient/Background Music
- `ambient-normal.mp3` - Neutral office/hospital ambient sounds for normal mode
- `ambient-tense.mp3` - Ominous drone/tension music for abuse mode
- `ambient-sad.mp3` - Sad/emotional piano for consequence reveals

### Sound Effects
- `click.mp3` - UI click sound
- `panel-open.mp3` - Sound when data panel opens
- `panel-close.mp3` - Sound when data panel closes
- `alert.mp3` - Alert/warning sound
- `typing.mp3` - Keyboard typing sounds
- `footsteps.mp3` - Character movement sound (optional)

## Audio Format Recommendations

- **Format**: MP3 or OGG for broad browser support
- **Sample Rate**: 44.1 kHz
- **Bit Rate**: 128-192 kbps (balance between quality and file size)
- **Length**:
  - Ambient tracks: 2-5 minutes (will loop)
  - SFX: < 2 seconds

## Where to Find Assets

Free/Royalty-Free Sources:
- **Freesound.org** - Creative Commons sounds
- **OpenGameArt.org** - Game-specific audio
- **Incompetech.com** - Kevin MacLeod's royalty-free music
- **ZapsPlat.com** - Free SFX library
- **Pixabay** - Free sound effects and music

AI Generation:
- **Suno AI** - Generate custom ambient music
- **ElevenLabs** - Sound effect generation
- **Soundraw** - AI music composition

## Current Status

No audio files currently loaded. The AudioManager is configured and ready to use once assets are added to this directory.

## Integration

Audio files are loaded in `PreloadScene.ts` using:
```typescript
AudioManager.loadAudio(this);
```

And played in `WorldScene.ts` using:
```typescript
const audioManager = new AudioManager(this);
audioManager.playAmbient('ambient-normal');
audioManager.playSFX('click');
```
