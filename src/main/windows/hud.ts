/**
 * Gemini Desktop - HUD Window
 * 
 * The HUD (Heads-Up Display) is a floating overlay.
 * Key behaviors:
 * - Frameless, transparent, always on top
 * - NEVER reloads - preserves conversation state
 * - Escape key dismisses
 * - Hotkey toggles visibility
 * - Skips taskbar
 */

import { BrowserWindow, session, shell, ipcMain, screen } from 'electron';
import { setupAuthInterception, setupAuthErrorDetection, copyAuthCookies } from '../auth.js';
import { setWindowBounds, getWindowBounds } from '../store.js';
import { showStandardWindow } from './standard.js';
import { createSignInWindow } from './auth-window.js';
import path from 'path';
import { fileURLToPath } from 'url';

// URLs
const GEMINI_URL = 'https://gemini.google.com';

// Session partitions
const SESSION_PARTITION = 'persist:gemini';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Window reference
let hudWindow: BrowserWindow | null = null;
let signInWindow: BrowserWindow | null = null;

// Default HUD bounds
const DEFAULT_HUD_BOUNDS = {
    width: 420,
    height: 700,
    x: undefined as number | undefined,
    y: undefined as number | undefined
};

/**
 * Create the HUD Window
 */
export function createHUDWindow(): BrowserWindow {
    const ses = session.fromPartition(SESSION_PARTITION);
    setupAuthInterception(ses);

    // Watch for auth errors
    setupAuthErrorDetection(ses, () => {
        // If HUD is visible when auth fails, hide it and open standard window
        if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
            console.log('[HUD] Auth error detected. Switching to Standard Window.');
            hudWindow.hide();

            // Open standard window to prompt re-login
            showStandardWindow();
        }
    });

    // Get saved bounds or use defaults
    const savedBounds = getWindowBounds('hud');

    // Calculate max dimensions (80% of primary display work area)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const maxWidth = Math.round(screenWidth * 0.8);
    const maxHeight = Math.round(screenHeight * 0.8);

    const win = new BrowserWindow({
        width: savedBounds.width,
        height: savedBounds.height,
        x: savedBounds.x,
        y: savedBounds.y,
        minWidth: 300,
        minHeight: 400,
        show: false,

        // HUD-specific settings
        frame: false,
        transparent: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
        maximizable: false,      // Prevent "snapping" to full screen
        fullscreenable: false,   // Prevent OS fullscreen
        maxWidth: maxWidth,      // 80% of screen width
        maxHeight: maxHeight,    // 80% of screen height
        icon: path.join(__dirname, process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.icns'), // Cross-platform icon

        webPreferences: {
            partition: SESSION_PARTITION,
            contextIsolation: true,
            nodeIntegration: false
            // NOTE: No preload - doesn't work on external URLs with sandbox
        }
    });

    // Save window bounds when resized or moved
    win.on('resize', () => {
        if (!win.isMinimized()) {
            const bounds = win.getBounds();
            setWindowBounds('hud', bounds);
        }
    });

    win.on('move', () => {
        if (!win.isMinimized()) {
            const bounds = win.getBounds();
            setWindowBounds('hud', bounds);
        }
    });

    // Intercept Google sign-in
    win.webContents.on('will-navigate', (event, url) => {
        if (url.includes('accounts.google.com')) {
            console.log('[HUD] Redirected to sign-in. Switching to Standard/Auth flow.');
            event.preventDefault();
            win.hide();
            handleSignIn(url);
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes('accounts.google.com')) {
            handleSignIn(url);
            return { action: 'deny' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Helper to handle sign-in flow
    function handleSignIn(url: string) {
        if (signInWindow && !signInWindow.isDestroyed()) {
            signInWindow.loadURL(url);
            signInWindow.show();
            signInWindow.focus();
            return;
        }

        signInWindow = createSignInWindow(url);

        // Handle successful login
        signInWindow.webContents.on('did-navigate', async (_e, navUrl) => {
            if (navUrl.includes('gemini.google.com') && !navUrl.includes('accounts.google.com')) {
                await copyAuthCookies();
                signInWindow?.close();
                if (hudWindow && !hudWindow.isDestroyed()) {
                    hudWindow.loadURL(GEMINI_URL);
                    hudWindow.show();
                    hudWindow.focus();
                }
            }
        });

        signInWindow.on('closed', () => {
            signInWindow = null;
        });
    }

    // Inject CSS and JavaScript for HUD functionality
    win.webContents.on('did-finish-load', () => {
        console.log('[HUD] did-finish-load event fired!');

        // Inject CSS for rounded corners and styling
        win.webContents.insertCSS(`
        /* Larger hitbox area behind the pill */
        html::after {
          content: '' !important;
          display: block !important;
          position: fixed !important;
          top: 2px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 80px !important;
          height: 18px !important;
          -webkit-app-region: drag;
          z-index: 2147483646 !important;
          background: rgba(180, 180, 180, 0.3) !important;
          border-radius: 6px !important;
          pointer-events: auto !important;
          cursor: grab !important;
        }
        
        /* Minimal drag pill - the visible handle */
        html::before {
          content: '' !important;
          display: block !important;
          position: fixed !important;
          top: 7px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 40px !important;
          height: 5px !important;
          -webkit-app-region: drag;
          z-index: 2147483647 !important;
          background: rgba(100, 100, 100, 0.5) !important;
          border-radius: 3px !important;
          pointer-events: auto !important;
          cursor: grab !important;
        }
        
        /* Rounded corners container */
        /* Raw window styling - no border */
        html, body {
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          overflow: hidden !important;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.3);
          border-radius: 4px;
        }
      `);

        console.log('[HUD] CSS injected (pure CSS drag handle)');
    });

    // Load Gemini (only once - never reload)
    win.loadURL(GEMINI_URL);

    hudWindow = win;
    return win;
}

/**
 * Show the HUD Window (does NOT reload)
 */
export function showHUDWindow(): void {
    if (!hudWindow || hudWindow.isDestroyed()) {
        hudWindow = createHUDWindow();
        hudWindow.once('ready-to-show', () => {
            hudWindow?.show();
            hudWindow?.focus();
            // Send message to focus input
            hudWindow?.webContents.send('focus-input');
        });
    } else {
        hudWindow.show();
        hudWindow.focus();
        // Focus the text input
        hudWindow.webContents.send('focus-input');
    }
}

/**
 * Hide the HUD Window (preserves state)
 */
export function hideHUDWindow(): void {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.hide();
    }
}

/**
 * Toggle HUD visibility
 */
export function toggleHUDWindow(): void {
    console.log('[HUD] Toggle called. Window exists:', !!hudWindow, 'Visible:', hudWindow?.isVisible());

    if (!hudWindow || hudWindow.isDestroyed()) {
        console.log('[HUD] Creating new window');
        showHUDWindow();
    } else if (hudWindow.isVisible()) {
        console.log('[HUD] Hiding window');
        hideHUDWindow();
    } else {
        console.log('[HUD] Showing window');
        showHUDWindow();
    }

    // Update tray menu to reflect new visibility state
    // Delayed import to avoid circular dependency
    import('../tray.js').then(({ updateTrayMenu }) => updateTrayMenu()).catch(() => { });
}

/**
 * Get the HUD Window reference
 */
export function getHUDWindow(): BrowserWindow | null {
    return hudWindow;
}

/**
 * Get current HUD bounds
 */
export function getHUDBounds(): typeof DEFAULT_HUD_BOUNDS | null {
    if (!hudWindow || hudWindow.isDestroyed()) return null;
    return hudWindow.getBounds();
}

// Handle IPC from HUD preload (Escape key)
ipcMain.on('hud:hide', () => {
    hideHUDWindow();
});
