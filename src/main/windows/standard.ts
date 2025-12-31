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

import { BrowserWindow, session, shell, ipcMain } from 'electron';
import { setupAuthInterception } from '../auth.js';

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
                if (standardWindow && !standardWindow.isDestroyed()) {
                    standardWindow.loadURL(GEMINI_URL);
                    standardWindow.show();
                    standardWindow.focus();
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

/**
 * Create the Standard Window
 */
export function createStandardWindow(bounds?: typeof DEFAULT_BOUNDS): BrowserWindow {
    const ses = session.fromPartition(SESSION_PARTITION);
    setupAuthInterception(ses);

    const win = new BrowserWindow({
        width: bounds?.width || DEFAULT_BOUNDS.width,
        height: bounds?.height || DEFAULT_BOUNDS.height,
        x: bounds?.x,
        y: bounds?.y,
        minWidth: 600,
        minHeight: 400,
        show: false,
        frame: true,
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
        win.show();
    });

    // Handle close - hide instead of quit
    win.on('close', (event) => {
        // For now, just close normally
        // Later: hide to tray based on settings
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
