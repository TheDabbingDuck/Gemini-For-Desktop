/**
 * Gemini Desktop - Standard Window
 * 
 * The Standard Window is the main Gemini experience.
 * Key behaviors:
 * - Native window frame
 * - Starts fresh (reloads) when shown
 * - Hides to tray on close (doesn't quit)
 * - Remembers position and size
 */

import { BrowserWindow, session, shell, ipcMain, app } from 'electron';
import { setupAuthInterception, copyAuthCookies } from '../auth.js';
import { getHUDWindow } from './hud.js';
import { getSetting, setWindowBounds, getWindowBounds } from '../store.js';
import { createSignInWindow } from './auth-window.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URLs
const GEMINI_URL = 'https://gemini.google.com';

// Session partitions
const SESSION_PARTITION = 'persist:gemini';

// Window reference
let standardWindow: BrowserWindow | null = null;
let signInWindow: BrowserWindow | null = null;

// Default window bounds
const DEFAULT_BOUNDS = {
    width: 1200,
    height: 800,
    x: undefined as number | undefined,
    y: undefined as number | undefined
};

/**
 * Check if user is signed in
 */
async function checkSignedIn(): Promise<boolean> {
    const ses = session.fromPartition(SESSION_PARTITION);
    const cookies = await ses.cookies.get({ domain: '.google.com' });
    const authCookies = cookies.filter(c =>
        c.name === 'SID' || c.name === 'SSID' || c.name === '__Secure-1PSID'
    );
    return authCookies.length > 0;
}

export function createStandardWindow(): BrowserWindow {
    const ses = session.fromPartition(SESSION_PARTITION);
    setupAuthInterception(ses);

    // Get saved bounds or use defaults
    const savedBounds = getWindowBounds('standard');

    const win = new BrowserWindow({
        width: savedBounds.width,
        height: savedBounds.height,
        x: savedBounds.x,
        y: savedBounds.y,
        minWidth: 600,
        minHeight: 400,
        show: false,
        frame: true,
        autoHideMenuBar: true, // Hide menu bar, Alt key to show
        skipTaskbar: false, // Ensure window appears in taskbar
        icon: path.join(__dirname, process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.icns'), // Cross-platform icon
        webPreferences: {
            partition: SESSION_PARTITION,
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Intercept Google sign-in navigation
    win.webContents.on('will-navigate', (event, url) => {
        if (url.includes('accounts.google.com')) {
            event.preventDefault();
            handleSignIn(url);
        }
    });

    // Intercept popup windows
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes('accounts.google.com')) {
            handleSignIn(url);
            return { action: 'deny' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Handle sign-in flow
    function handleSignIn(url: string) {
        if (signInWindow && !signInWindow.isDestroyed()) {
            signInWindow.loadURL(url);
            signInWindow.show();
            signInWindow.focus();
            return;
        }

        signInWindow = createSignInWindow(url, win); // Pass parent for modal

        signInWindow.webContents.on('did-navigate', async (_e, navUrl) => {
            if (navUrl.includes('gemini.google.com') && !navUrl.includes('accounts.google.com')) {
                // Copy cookies and close
                await copyAuthCookies();
                signInWindow?.close();

                // Reload Standard Window
                if (standardWindow && !standardWindow.isDestroyed()) {
                    standardWindow.loadURL(GEMINI_URL);
                    standardWindow.show();
                    standardWindow.focus();
                }

                // Also reload HUD so it gets the auth cookies
                const hudWindow = getHUDWindow();
                if (hudWindow && !hudWindow.isDestroyed()) {
                    console.log('[Auth] Reloading HUD after auth');
                    hudWindow.loadURL(GEMINI_URL);
                }
            }
        });

        signInWindow.on('closed', () => {
            signInWindow = null;
        });
    }

    // Load Gemini
    win.loadURL(GEMINI_URL);

    win.once('ready-to-show', () => {
        // Check if launched as hidden (startup item)
        const isHiddenLaunch = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAsHidden;

        if (!isHiddenLaunch) {
            win.show();
        } else {
            console.log('[Standard] Launched hidden (startup)');
        }
    });

    // Handle close - hide to tray or quit based on settings
    // Only apply when user clicks X, not when app.quit() is called
    let isQuitting = false;

    app.on('before-quit', () => {
        isQuitting = true;
    });

    win.on('close', (event) => {
        if (isQuitting) {
            // App is quitting (from tray quit, Cmd+Q, etc.) - allow close
            return;
        }

        const closeBehavior = getSetting('closeBehavior');
        if (closeBehavior === 'tray') {
            event.preventDefault();
            win.hide();
            console.log('[Standard] Hidden to tray');
        } else if (closeBehavior === 'quit') {
            // Quit the entire app when user closes window
            console.log('[Standard] Quitting app');
            app.quit();
        }
    });

    // Save window bounds when resized or moved
    win.on('resize', () => {
        if (!win.isMinimized()) {
            const bounds = win.getBounds();
            setWindowBounds('standard', bounds);
        }
    });

    win.on('move', () => {
        if (!win.isMinimized()) {
            const bounds = win.getBounds();
            setWindowBounds('standard', bounds);
        }
    });

    standardWindow = win;
    return win;
}

/**
 * Show the Standard Window
 * Reloads to fresh Gemini homepage
 */
export function showStandardWindow(): void {
    if (!standardWindow || standardWindow.isDestroyed()) {
        standardWindow = createStandardWindow();
    } else {
        // Reload to fresh state
        standardWindow.loadURL(GEMINI_URL);
        standardWindow.show();
        standardWindow.focus();
    }
}

/**
 * Hide the Standard Window
 */
export function hideStandardWindow(): void {
    if (standardWindow && !standardWindow.isDestroyed()) {
        standardWindow.hide();
    }
}

/**
 * Get the Standard Window reference
 */
export function getStandardWindow(): BrowserWindow | null {
    return standardWindow;
}

/**
 * Get current window bounds
 */
export function getStandardWindowBounds(): typeof DEFAULT_BOUNDS | null {
    if (!standardWindow || standardWindow.isDestroyed()) return null;
    return standardWindow.getBounds();
}
