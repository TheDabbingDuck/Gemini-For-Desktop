/**
 * Gemini Desktop - Onboarding Window
 * 
 * Welcome popup shown on startup until user clicks "Don't show again".
 */

import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSetting, setSetting } from '../store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let onboardingWindow: BrowserWindow | null = null;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Check if onboarding should be shown
 */
export function shouldShowOnboarding(): boolean {
    return !getSetting('hasSeenOnboarding');
}

/**
 * Create and show the onboarding window
 */
export function showOnboardingWindow(): void {
    if (onboardingWindow && !onboardingWindow.isDestroyed()) {
        onboardingWindow.focus();
        return;
    }

    onboardingWindow = new BrowserWindow({
        width: 520,
        height: 640,
        resizable: false,
        minimizable: false,
        maximizable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        icon: path.join(__dirname, process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.icns'), // Cross-platform icon
        center: true,
        show: false, // Show after ready
        webPreferences: {
            preload: path.join(__dirname, '../preload/onboarding.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // Required for preload to work
        }
    });

    // Show window when ready
    onboardingWindow.once('ready-to-show', () => {
        onboardingWindow?.show();
    });

    // Load the onboarding HTML - different paths for dev vs production
    if (isDev && process.env.ELECTRON_RENDERER_URL) {
        // In dev mode, load from Vite dev server
        const url = `${process.env.ELECTRON_RENDERER_URL}/onboarding/index.html`;
        console.log('[Onboarding] Loading URL:', url);
        onboardingWindow.loadURL(url);
    } else {
        // In production, load from compiled files
        const onboardingPath = path.join(__dirname, '../renderer/onboarding/index.html');
        onboardingWindow.loadFile(onboardingPath);
    }

    onboardingWindow.on('closed', () => {
        onboardingWindow = null;
    });

    console.log('[Onboarding] Window opened');
}

/**
 * Close the onboarding window
 */
export function closeOnboardingWindow(): void {
    if (onboardingWindow && !onboardingWindow.isDestroyed()) {
        onboardingWindow.close();
    }
}

/**
 * Get the onboarding window reference
 */
export function getOnboardingWindow(): BrowserWindow | null {
    return onboardingWindow;
}

/**
 * Register onboarding IPC handlers
 */
export function registerOnboardingIPC(): void {
    // Dismiss for this session (don't set flag, will show again next launch)
    ipcMain.on('onboarding:dismiss', () => {
        console.log('[Onboarding] Dismissed for this session');
        closeOnboardingWindow();
    });

    // Don't show again (set flag permanently)
    ipcMain.on('onboarding:dontShowAgain', () => {
        console.log('[Onboarding] Don\'t show again clicked');
        setSetting('hasSeenOnboarding', true);
        closeOnboardingWindow();
    });

    // Open settings (for customizing hotkey)
    ipcMain.on('onboarding:openSettings', async () => {
        console.log('[Onboarding] Opening settings from onboarding');
        const { showSettingsWindow } = await import('./settings.js');
        closeOnboardingWindow();
        showSettingsWindow();
    });

    // Get current hotkey
    ipcMain.handle('onboarding:getHotkey', () => {
        return getSetting('hotkey');
    });

    console.log('[Onboarding] IPC handlers registered');
}
