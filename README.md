# LRC Player

A cross-platform desktop application for playing local audio files with support for LRC lyrics.

## Features

- ** Lyrics Support**: Display original lyrics and translations simultaneously
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Media Controls**: System-integrated media controls (play/pause, next/prev track, seek)
- **Album Art Support**: Displays embedded artwork and external cover files
- **Folder Navigation**: Easy browsing through your music collection
- **Playlist Management**: Auto-creates playlists from folders
- **Audio Controls**: Play/pause, skip tracks, volume control, seek functionality
- **Automatic LRC Syncing**: Lyrics scroll automatically with the music

## Installation

### Prerequisites
- Node.js 14+ and npm

### Quick Start
1. Clone the repository
```bash
git clone https://github.com/yuygfgg/lrc-player.git
cd lrc-player
```

2. Install dependencies
```bash
npm install
```

3. Run the application
```bash
npm start
```

### Building for Distribution
```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win
npm run build:mac
npm run build:linux
```

## Usage

1. **Open a Music Folder**: Click the "Browse" button to select a folder containing your music files
2. **Play Music**: Click on any audio file in the file browser to begin playback
3. **Navigate**: Use the control buttons or keyboard shortcuts to control playback
   - Space: Play/Pause
   - Left/Right arrows: Seek backward/forward 10 seconds
   - Ctrl+Left/Right: Previous/Next track

## LRC File Format

The player supports standard LRC files with timing tags. For support, the player interprets lines without timing tags as translations for the previous line. Example:
**LRC File Setup**: Create LRC files with the same name as your audio file (e.g., `song.mp3` → `song.lrc`)

## Album Artwork

The player looks for album artwork in the following order:
1. Embedded artwork in the audio file
2. A file named "cover.jpg" or "cover.png" in the same directory as the audio file

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Left Arrow**: Rewind 5 seconds
- **Right Arrow**: Forward 30 seconds
- **Ctrl+Left**: Previous track
- **Ctrl+Right**: Next track

## License

GPLv3