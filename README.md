# Gemini Desktop

> Desktop application for Google Gemini with floating HUD and system tray integration.

## Features

- **Standard Window** - Full-featured Gemini experience for deep work sessions
- **Floating HUD** - Quick-access overlay that preserves your conversation
- **Global Hotkey** - `Ctrl+Shift+G` (Windows) / `Cmd+Shift+G` (macOS) to summon/dismiss
- **System Tray** - Runs in the background, always accessible

## Development

### Prerequisites

- Node.js 22.12 or higher
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building

```bash
# Build for Windows
npm run package:win

# Build for macOS (Apple Silicon)
npm run package:mac

# Build for macOS (Intel)
npm run package:mac-intel
```

## Installation

> ⚠️ **Note:** This application is not signed/notarized. You may see security warnings.

### Windows
1. Download the `.exe` installer from Releases
2. If SmartScreen blocks it: Click "More Info" → "Run anyway"

### macOS
1. Download the `.dmg` for your chip (Intel or Apple Silicon)
2. If Gatekeeper blocks it: Right-click → Open → Open
3. Drag to Applications folder

## Usage

1. Launch the application
2. Sign in with your Google account
3. Use `Ctrl+Shift+G` / `Cmd+Shift+G` to toggle the HUD
4. Access settings from the system tray menu

## License

MIT