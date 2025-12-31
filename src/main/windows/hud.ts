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

import { BrowserWindow, session, shell, ipcMain } from 'electron';
import { setupAuthInterception } from '../auth.js';
import path from 'path';
import { fileURLToPath } from 'url';

// URLs
const GEMINI_URL = 'https://gemini.google.com';

// Session partitions
const SESSION_PARTITION = 'persist:gemini';
const SIGNIN_PARTITION = 'persist:gemini-auth';

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
 * Copy cookies from sign-in session to main session
 */
async function copyAuthCookies(): Promise<void> {
    const signInSession = session.fromPartition(SIGNIN_PARTITION);
    const mainSession = session.fromPartition(SESSION_PARTITION);

    const cookies = await signInSession.cookies.get({ domain: '.google.com' });
    for (const cookie of cookies) {
        try {
            await mainSession.cookies.set({
                url: `https://${cookie.domain?.replace(/^\./, '') || 'google.com'}${cookie.path || '/'}`,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate,
                sameSite: cookie.sameSite as 'unspecified' | 'no_restriction' | 'lax' | 'strict'
            });
        } catch (err) {
            // Ignore
        }
    }
}

/**
 * Create sign-in window for HUD
 */
function createSignInWindow(url: string): BrowserWindow {
    const win = new BrowserWindow({
        width: 500,
        height: 700,
        title: 'Sign in to Google',
        frame: true,
        webPreferences: {
            partition: SIGNIN_PARTITION,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    win.webContents.on('did-navigate', async (_e, navUrl) => {
        if (navUrl.includes('gemini.google.com') && !navUrl.includes('accounts.google.com')) {
            await copyAuthCookies();
            win.close();
            if (hudWindow && !hudWindow.isDestroyed()) {
                hudWindow.loadURL(GEMINI_URL);
                hudWindow.show();
                hudWindow.focus();
            }
        }
    });

    win.on('closed', () => {
        signInWindow = null;
    });

    win.loadURL(url);
    return win;
}

/**
 * Create the HUD Window
 */
export function createHUDWindow(bounds?: typeof DEFAULT_HUD_BOUNDS): BrowserWindow {
    const ses = session.fromPartition(SESSION_PARTITION);
    setupAuthInterception(ses);

    const win = new BrowserWindow({
        width: bounds?.width || DEFAULT_HUD_BOUNDS.width,
        height: bounds?.height || DEFAULT_HUD_BOUNDS.height,
        x: bounds?.x,
        y: bounds?.y,
        minWidth: 300,
        minHeight: 400,
        show: false,

        // HUD-specific settings
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,

        webPreferences: {
            partition: SESSION_PARTITION,
            contextIsolation: true,
            nodeIntegration: false
            // NOTE: No preload - doesn't work on external URLs with sandbox
        }
    });

    // Intercept Google sign-in
    win.webContents.on('will-navigate', (event, url) => {
        if (url.includes('accounts.google.com')) {
            event.preventDefault();
            if (!signInWindow || signInWindow.isDestroyed()) {
                signInWindow = createSignInWindow(url);
            } else {
                signInWindow.loadURL(url);
            }
            signInWindow.show();
            signInWindow.focus();
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes('accounts.google.com')) {
            if (!signInWindow || signInWindow.isDestroyed()) {
                signInWindow = createSignInWindow(url);
            } else {
                signInWindow.loadURL(url);
            }
            signInWindow.show();
            signInWindow.focus();
            return { action: 'deny' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

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
          background: rgba(180, 180, 180, 0.15) !important;
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
        
        /* Rounded corners */
        html, body {
          border-radius: 12px !important;
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
