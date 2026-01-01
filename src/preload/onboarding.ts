/**
 * Gemini Desktop - Onboarding Preload Script
 * 
 * Exposes IPC methods for the onboarding renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Onboarding API exposed to renderer
 */
const onboardingAPI = {
    /**
     * Dismiss onboarding for this session (shows again next launch)
     */
    dismiss: (): void => ipcRenderer.send('onboarding:dismiss'),

    /**
     * Don't show again (sets hasSeenOnboarding: true)
     */
    dontShowAgain: (): void => ipcRenderer.send('onboarding:dontShowAgain'),

    /**
     * Open settings window (for customizing hotkey)
     */
    openSettings: (): void => ipcRenderer.send('onboarding:openSettings'),

    /**
     * Get current hotkey
     */
    getHotkey: (): Promise<string> => ipcRenderer.invoke('onboarding:getHotkey')
};

contextBridge.exposeInMainWorld('onboardingAPI', onboardingAPI);

// TypeScript declaration for the exposed API
declare global {
    interface Window {
        onboardingAPI: typeof onboardingAPI;
    }
}
