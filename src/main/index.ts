/**
 * Gemini Desktop - Main Process Entry Point
 * 
 * Initializes the application and coordinates all modules.
 */

import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { createStandardWindow, getStandardWindow } from './windows/standard.js';
import { createHUDWindow, toggleHUDWindow, hideHUDWindow, getHUDWindow } from './windows/hud.js';

// Window references
let standardWindow: BrowserWindow | null = null;
let hudWindow: BrowserWindow | null = null;

// Default hotkey
const DEFAULT_HOTKEY = process.platform === 'darwin'
    ? 'CommandOrControl+Shift+G'
    : 'Ctrl+Shift+G';

/**
 * Register global hotkey
 */
function registerHotkey(): boolean {
    const registered = globalShortcut.register(DEFAULT_HOTKEY, () => {
        console.log('[Hotkey] Toggle HUD triggered');
        toggleHUDWindow();
    });

    if (registered) {
        console.log(`[Hotkey] Registered: ${DEFAULT_HOTKEY}`);
    } else {
        console.log(`[Hotkey] Failed to register: ${DEFAULT_HOTKEY}`);
    }

    return registered;
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
    console.log('[App] Initializing Gemini Desktop...');

    // Create the standard window
    standardWindow = createStandardWindow();

    // Create the HUD window (hidden)
    hudWindow = createHUDWindow();

    // Register global hotkey for HUD
    registerHotkey();

    console.log('[App] Initialization complete');
}

// Handle app lifecycle
app.whenReady().then(init);

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    // Don't quit - we want to stay in tray
    // On macOS, keep running
    // On Windows/Linux, also keep running (tray mode)
});

app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked
    if (!getStandardWindow() || getStandardWindow()?.isDestroyed()) {
        standardWindow = createStandardWindow();
    } else {
        getStandardWindow()?.show();
        getStandardWindow()?.focus();
    }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const win = getStandardWindow();
        if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });
}

// IPC handlers
ipcMain.on('hud:hide', () => {
    hideHUDWindow();
});

export { standardWindow, hudWindow };
