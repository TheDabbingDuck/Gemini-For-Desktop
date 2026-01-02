import { BrowserWindow } from 'electron';

export const SIGNIN_PARTITION = 'persist:gemini-auth';

/**
 * Create a dedicated sign-in window
 * @param url The URL to load (usually accounts.google.com)
 * @param parent Optional parent window
 */
export function createSignInWindow(url: string, parent?: BrowserWindow): BrowserWindow {
    const win = new BrowserWindow({
        width: 500,
        height: 700,
        title: 'Sign in to Google',
        frame: true,
        parent: parent, // Optional modal behavior
        modal: !!parent,
        webPreferences: {
            partition: SIGNIN_PARTITION,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    win.setMenu(null); // Remove menu bar for cleaner auth
    win.loadURL(url);

    return win;
}
