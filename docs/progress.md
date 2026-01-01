# Gemini Desktop - Development Progress

> **Last Updated:** December 31, 2024  
> **Status:** Phases 0-3 Complete, Ready for Phase 4

---

## Quick Summary

Building an Electron wrapper for Gemini (gemini.google.com) with two window modes:
- **Standard Window**: Full browser-like experience
- **HUD Window**: Floating overlay, always-on-top, global hotkey toggle

**Current State:** App runs, sign-in works, HUD with drag handle works, hotkey toggles HUD, system tray with context menu.

---

## Completed Phases

### Phase 0: Project Setup ✅
- ESM-configured TypeScript project
- Electron 39.2.7, electron-vite 5.0.0, Node.js 22+
- `npm run dev` works

### Phase 1: Authentication ✅
- **Key Finding:** Google blocks sign-in when UA spoofing is detected
- **Solution:** Two-session architecture:
  - `persist:gemini-auth` - Clean session (no spoofing) for sign-in
  - `persist:gemini` - Spoofed session for Gemini usage
  - Cookies copied from auth → main session after sign-in
- Session persists across restarts

### Phase 2: Window Management ✅
- Standard Window: Native frame, loads Gemini
- HUD Window: Frameless, transparent, always-on-top
- **Key Finding:** Gemini's CSP blocks JavaScript injection
- **Solution:** Drag handle via pure CSS (`html::before`/`::after`)
- Global hotkey (Ctrl+Shift+G) toggles HUD visibility

### Phase 3: System Tray & Hotkey ✅
- System tray with placeholder icon (proper icons pending)
- Context menu: Show Main Window, Toggle HUD (with checkmark), Settings (placeholder), Quit
- Left-click tray: Shows Standard Window
- Hotkey module extracted to `hotkey.ts`
- Tray checkmarks update when HUD toggled via hotkey
- HUD reloads automatically when user signs in via Standard Window
- Standard Window explicitly shows in taskbar (`skipTaskbar: false`)

---

## Current File Structure

```
src/main/
├── index.ts          # Entry point, coordinates all modules
├── auth.ts           # UA spoofing for Google domains
├── tray.ts           # System tray with context menu
├── hotkey.ts         # Global hotkey registration
└── windows/
    ├── standard.ts   # Standard window + sign-in handling
    └── hud.ts        # HUD window + CSS drag handle injection

src/preload/
├── index.ts          # Main preload (unused currently)
└── hud.ts            # HUD preload (CSP blocks it - not actively used)
```

---

## Phase 4: Settings & Onboarding (NEXT)

### To Implement
1. **Settings Store** (`src/main/store.ts`)
   - electron-store for persistence
   - Launch on startup, close behavior, window bounds

2. **Settings UI** (`src/renderer/settings/`)
   - Toggle: Launch on Startup
   - Radio: Close behavior (tray vs quit)

3. **First-Run Onboarding**
   - Welcome modal explaining hotkey and features

### Reference: Implementation Plan
See `docs/implementation-plan.md` Phase 3 (lines 344-404)

---

## Known Issues / Deferred Items

| Item | Reason | Deferred To |
|------|--------|-------------|
| Escape key hides HUD | CSP blocks JS injection | Phase 5 or accept as limitation |
| Standard Window auto-reload | Works but not automatic | Phase 4 |
| Window position persistence | Needs electron-store setup | Phase 4 |
| macOS testing | No Mac available in WSL | Phase 6 |

---

## Key Technical Decisions

1. **Two-Session Auth**: Google blocks embedded browser sign-in. Solution: separate clean session for auth.

2. **CSS-Only Drag Handle**: Can't inject JS into Gemini page. Solution: `insertCSS()` with `html::before`/`::after` pseudo-elements.

3. **No Preload for External URLs**: Electron preload scripts don't work when loading external URLs with sandbox enabled.

---

## How to Continue

```powershell
cd C:\Users\caleb\Gemini-For-Desktop
npm run dev
```

Then tell the AI:
> "Continue with Phase 4: Settings & Onboarding. See docs/progress.md and docs/implementation-plan.md for context."

---

## Reference Docs

- [implementation-plan.md](./implementation-plan.md) - Full implementation plan with code samples
- [project-requirements.md](./project-requirements.md) - Feature requirements
- [dependency-analysis.md](./dependency-analysis.md) - Dependency version research
