# Web Media Manager

A modern web-based media management application focused on local media libraries, portable device synchronization, metadata management, and high-performance playback. 

## Live Demo

The application is deployed on GitHub Pages:

https://brandon-james-dev.github.io/web-media-manager/

Open it directly in your browser — no installation required.

## Features

### Library Management

- Scan and import local media libraries
- Organize music, albums, artists, and playlists
- Edit metadata and artwork
- Fast client-side searching and filtering
- Multi-column sorting and grouping

### Playlist Management

- Create and manage playlists
- Import playlists from supported devices
- Smart playlist support
- Playlist editing and track reordering

### Device Support

- Classic iPod synchronization
- iTunesDB parsing and generation
- Artwork database support
- Device library inspection
- Playlist and metadata synchronization

### Audio Playback

- Web Audio API playback engine
- Gapless playback support
- Queue management
- Volume and gain control
- Efficient buffering and scheduling

### Metadata

- Track metadata editing
- Album artwork management
- Automatic metadata parsing
- Bulk metadata operations

## Architecture

```text
Web Media Manager
│
├── Application
│   ├── React
│   ├── TypeScript
│   └── Vite
│
├── Playback Engine
│   ├── Web Audio API
│   ├── Queue Management
│   └── Audio Scheduling
│
├── Library
│   ├── Artists
│   ├── Albums
│   ├── Tracks
│   └── Playlists
│
├── Device Support
│   ├── iPod
│   ├── iTunesDB
│   ├── ArtworkDB
│   └── Sync Engine
│
└── Persistence
    ├── Settings
    ├── Metadata
    └── Cache
```

## Current Development Status

### Core Application

```text
React application shell
Library browsing
Track management
Playlist management
Search and filtering
Sorting infrastructure
```

### Playback

```text
Web Audio playback
Queue management
Timing optimization
Gain control
Playback state management
```

### Device Support

```text
COMING
```

### Performance

```text
Memoized table rendering
Parent-controlled state
Virtualization-ready architecture
Stable object identity optimization
React render reduction
```

## Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build application:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Debugging

Start development server and attach debugger:

```text
F5
```

VS Code is configured to:

1. Start the Vite development server
2. Launch Microsoft Edge
3. Attach the debugger to the running application

## Project Goals

- Modern replacement for legacy media managers
- First-class Classic iPod support
- High-performance media library management
- Extensible synchronization architecture
- Cross-platform operation
- Large-library performance at scale

## Roadmap

### Near Term

```text
- ArtworkDB support
- Smart playlist rule decoding
- Additional iPod database support
- Library import improvements
```

### Long Term

```text
- Full device synchronization
- Plugin architecture
- Additional portable media devices
- Enhanced metadata tools
- Native application packaging
```

## VS Code Configuration

This configuration is helpful for starting the app in debug mode

### launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Vite App",
      "type": "msedge",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "preLaunchTask": "vite",
      "postDebugTask": "terminate all tasks"
    }
  ]
}

```

### tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "vite",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": {
        "owner": "vite",
        "pattern": {
          "regexp": "."
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".",
          "endsPattern": "ready in"
        }
      }
    },
    {
      "label": "terminate all tasks",
      "type": "shell",
      "command": "${command:workbench.action.tasks.terminate}",
      "args": ["vite"]
    }
  ]
}

```