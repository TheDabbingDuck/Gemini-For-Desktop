/**
 * Gemini Desktop - Settings Window
 * 
 * Modal window for user settings.
 */

import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSetting, setSetting, resetSettings, getAllSettings } from '../store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let settingsWindow: BrowserWindow | null = null;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Create and show the settings window
 */
export function showSettingsWindow(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 500,
        height: 620,
        resizable: false,
        minimizable: false,
        maximizable: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        icon: path.join(__dirname, process.platform === 'win32' ? '../../resources/icon.ico' : '../../resources/icon.icns'), // Cross-platform icon
        show: false, // Show after ready
        center: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/settings.mjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false // Required for preload to work
        }
    });

    // Show window when ready
    settingsWindow.once('ready-to-show', () => {
        settingsWindow?.show();
    });

    // Load the settings HTML - different paths for dev vs production
    if (isDev && process.env.ELECTRON_RENDERER_URL) {
        // In dev mode, load from Vite dev server
        const url = `${process.env.ELECTRON_RENDERER_URL}/settings/index.html`;
        console.log('[Settings] Loading URL:', url);
        settingsWindow.loadURL(url);
    } else {
        // In production, load from compiled files
        const settingsPath = path.join(__dirname, '../renderer/settings/index.html');
        settingsWindow.loadFile(settingsPath);
    }

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });

    console.log('[Settings] Window opened');
}

/**
 * Close the settings window
 */
export function closeSettingsWindow(): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.close();
    }
}

/**
 * Get the settings window reference
 */
export function getSettingsWindow(): BrowserWindow | null {
    return settingsWindow;
}

/**
 * Apply launch on startup setting
 */
export function applyLaunchOnStartup(enabled: boolean): void {
    app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,  // macOS: Open hidden
        args: ['--hidden']   // Windows: Pass flag to check on startup
    });
    console.log(`[Settings] Launch on startup: ${enabled}`);
}

/**
 * Register settings IPC handlers
 */
export function registerSettingsIPC(): void {
    // Get settings
    ipcMain.handle('settings:get', () => {
        return {
            launchOnStartup: getSetting('launchOnStartup'),
            closeBehavior: getSetting('closeBehavior'),
            hotkey: getSetting('hotkey')
        };
    });

    // Save settings
    ipcMain.handle('settings:save', (_event, settings: {
        launchOnStartup: boolean;
        closeBehavior: 'tray' | 'quit';
    }) => {
        setSetting('launchOnStartup', settings.launchOnStartup);
        setSetting('closeBehavior', settings.closeBehavior);

        // Apply launch on startup immediately
        applyLaunchOnStartup(settings.launchOnStartup);

        console.log('[Settings] Saved:', settings);
    });

    // Reset settings (includes hotkey)
    ipcMain.handle('settings:reset', async () => {
        // Import hotkey module dynamically to avoid circular dependency
        const { updateHotkey, getDefaultHotkey } = await import('../hotkey.js');
        const { defaults } = await import('../store.js');
        const { getStandardWindow } = await import('./standard.js');
        const { getHUDWindow } = await import('./hud.js');

        resetSettings();

        // Reset startup to DEFAULT value (true), regardless of current state
        applyLaunchOnStartup(defaults.launchOnStartup);

        updateHotkey(getDefaultHotkey());

        // Reset window positions running in memory
        const stdWin = getStandardWindow();
        if (stdWin && !stdWin.isDestroyed()) {
            stdWin.setBounds(defaults.windowBounds.standard);
            console.log('[Settings] Reset standard window bounds');
        }

        const hudWin = getHUDWindow();
        if (hudWin && !hudWin.isDestroyed()) {
            hudWin.setBounds(defaults.windowBounds.hud);
            console.log('[Settings] Reset HUD window bounds');
        }

        console.log('[Settings] Reset to defaults');
        return {
            launchOnStartup: defaults.launchOnStartup,
            closeBehavior: defaults.closeBehavior,
            hotkey: getDefaultHotkey()
        };
    });

    // Set hotkey
    ipcMain.handle('settings:setHotkey', async (_event, hotkey: string) => {
        const { updateHotkey } = await import('../hotkey.js');
        const success = updateHotkey(hotkey);
        return success;
    });

    // Close window
    ipcMain.on('settings:close', () => {
        closeSettingsWindow();
    });

    console.log('[Settings] IPC handlers registered');
}
