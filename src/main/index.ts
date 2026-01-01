/**
 * Gemini Desktop - Main Process Entry Point
 * 
 * Initializes the application and coordinates all modules.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { createStandardWindow, getStandardWindow } from './windows/standard.js';
import { createHUDWindow, hideHUDWindow } from './windows/hud.js';
import { registerSettingsIPC, applyLaunchOnStartup } from './windows/settings.js';
import { registerOnboardingIPC, shouldShowOnboarding, showOnboardingWindow } from './windows/onboarding.js';
import { createTray } from './tray.js';
import { registerHotkeys, unregisterHotkeys } from './hotkey.js';
import { getSetting } from './store.js';

// Window references
let standardWindow: BrowserWindow | null = null;
let hudWindow: BrowserWindow | null = null;

/**
 * Initialize the application
 */
async function init(): Promise<void> {
    console.log('[App] Initializing Gemini Desktop...');

    // Register IPC handlers first
    registerSettingsIPC();
    registerOnboardingIPC();

    // Create the standard window
    standardWindow = createStandardWindow();

    // Create the HUD window (hidden)
    hudWindow = createHUDWindow();

    // Create system tray
    createTray();

    // Register global hotkeys
    registerHotkeys();

    // Apply launch on startup setting (register with OS)
    applyLaunchOnStartup(getSetting('launchOnStartup'));

    // Show onboarding if user hasn't seen it (or dismissed permanently)
    if (shouldShowOnboarding()) {
        // Delay slightly to let main window load
        setTimeout(() => {
            showOnboardingWindow();
        }, 1000);
    }

    console.log('[App] Initialization complete');
}

// Handle app lifecycle
app.whenReady().then(init);

app.on('will-quit', () => {
    // Unregister all shortcuts
    unregisterHotkeys();
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
