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
import { setupAuthInterception } from '../auth.js';
import { getHUDWindow } from './hud.js';
import { getSetting, setWindowBounds, getWindowBounds } from '../store.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URLs
const GEMINI_URL = 'https://gemini.google.com';

// Session partitions
const SESSION_PARTITION = 'persist:gemini';
const SIGNIN_PARTITION = 'persist:gemini-auth';

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

/**
 * Copy cookies from sign-in session to main session
 */
async function copyAuthCookies(): Promise<void> {
    const signInSession = session.fromPartition(SIGNIN_PARTITION);
    const mainSession = session.fromPartition(SESSION_PARTITION);

    const cookies = await signInSession.cookies.get({ domain: '.google.com' });
    console.log(`[Auth] Copying ${cookies.length} cookies`);

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
            // Ignore cookie copy errors
        }
    }
}

/**
 * Create sign-in window (clean session, no spoofing)
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
            const isSignedIn = await checkSignedIn();
            if (isSignedIn || true) { // Copy cookies regardless
                await copyAuthCookies();
                win.close();

                // Reload Standard Window
                if (standardWindow && !standardWindow.isDestroyed()) {
                    standardWindow.loadURL(GEMINI_URL);
                    standardWindow.show();
                    standardWindow.focus();
                }

                // Also reload HUD so it gets the auth cookies
                const hudWindow = getHUDWindow();
                if (hudWindow && !hudWindow.isDestroyed()) {
                    console.log('[Auth] Reloading HUD with new auth cookies');
                    hudWindow.loadURL(GEMINI_URL);
                }
            }
        }
    });

    win.on('closed', () => {
        signInWindow = null;
    });

    win.loadURL(url);
    return win;
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
            if (!signInWindow || signInWindow.isDestroyed()) {
                signInWindow = createSignInWindow(url);
            } else {
                signInWindow.loadURL(url);
            }
            signInWindow.show();
            signInWindow.focus();
        }
    });

    // Intercept popup windows
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
