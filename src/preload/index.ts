/**
 * Gemini Desktop - Main Preload Script
 * 
 * This script runs in the renderer context but has access to Node.js APIs.
 * It creates a bridge between the main process and the web page.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('geminiDesktop', {
    // Version info
    version: '1.0.0',

    // Platform detection
    platform: process.platform,

    // IPC methods (to be expanded)
    send: (channel: string, ...args: unknown[]) => {
        const validChannels = ['window:minimize', 'window:close', 'settings:open'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, ...args);
        }
    },

    on: (channel: string, callback: (...args: unknown[]) => void) => {
        const validChannels = ['focus-input'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => callback(...args));
        }
    }
});
