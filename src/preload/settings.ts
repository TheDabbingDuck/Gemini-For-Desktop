/**
 * Gemini Desktop - Settings Preload Script
 * 
 * Exposes IPC methods for the settings renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Settings API exposed to renderer
 */
const settingsAPI = {
    /**
     * Get all current settings
     */
    getSettings: (): Promise<{
        launchOnStartup: boolean;
        closeBehavior: 'tray' | 'quit';
        hotkey: string;
    }> => ipcRenderer.invoke('settings:get'),

    /**
     * Save settings (excluding hotkey - use setHotkey for that)
     */
    saveSettings: (settings: {
        launchOnStartup: boolean;
        closeBehavior: 'tray' | 'quit';
    }): Promise<void> => ipcRenderer.invoke('settings:save', settings),

    /**
     * Set the global hotkey
     * @returns true if hotkey was set successfully
     */
    setHotkey: (hotkey: string): Promise<boolean> => ipcRenderer.invoke('settings:setHotkey', hotkey),

    /**
     * Reset settings to defaults
     */
    resetSettings: (): Promise<{
        launchOnStartup: boolean;
        closeBehavior: 'tray' | 'quit';
        hotkey: string;
    }> => ipcRenderer.invoke('settings:reset'),

    /**
     * Close the settings window
     */
    close: (): void => ipcRenderer.send('settings:close')
};

contextBridge.exposeInMainWorld('settingsAPI', settingsAPI);

// TypeScript declaration for the exposed API
declare global {
    interface Window {
        settingsAPI: typeof settingsAPI;
    }
}
