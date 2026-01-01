/**
 * Gemini Desktop - Settings Store
 * 
 * Persistent settings storage using electron-store.
 * Automatically handles first-load edge cases by creating
 * config file with defaults if it doesn't exist.
 */

import Store from 'electron-store';

/**
 * Settings interface
 */
export interface Settings {
    launchOnStartup: boolean;
    closeBehavior: 'tray' | 'quit';
    hasSeenOnboarding: boolean;  // Only set true on "Don't show again"
    hotkey: string;  // Electron accelerator format, e.g. "CommandOrControl+Shift+G"
    windowBounds: {
        standard: { x?: number; y?: number; width: number; height: number };
        hud: { x?: number; y?: number; width: number; height: number };
    };
}

/**
 * Default settings
 */
const defaults: Settings = {
    launchOnStartup: true,
    closeBehavior: 'tray',
    hasSeenOnboarding: false,  // Shows onboarding until "Don't show again"
    hotkey: 'CommandOrControl+Shift+G',  // Works on both Windows (Ctrl) and macOS (Cmd)
    windowBounds: {
        standard: { width: 1200, height: 800 },
        hud: { width: 420, height: 700 }
    }
};

/**
 * Settings store instance
 */
export const store = new Store<Settings>({
    name: 'settings',
    defaults
});

/**
 * Get a setting value
 */
export function getSetting<K extends keyof Settings>(key: K): Settings[K] {
    return store.get(key);
}

/**
 * Set a setting value
 */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    store.set(key, value);
    console.log(`[Store] Set ${key}:`, value);
}

/**
 * Get all settings
 */
export function getAllSettings(): Settings {
    return {
        launchOnStartup: store.get('launchOnStartup'),
        closeBehavior: store.get('closeBehavior'),
        hasSeenOnboarding: store.get('hasSeenOnboarding'),
        hotkey: store.get('hotkey'),
        windowBounds: store.get('windowBounds')
    };
}

/**
 * Reset all settings to defaults
 */
export function resetSettings(): void {
    store.clear();
    console.log('[Store] Reset to defaults');
}

/**
 * Update window bounds for a specific window
 */
export function setWindowBounds(
    windowType: 'standard' | 'hud',
    bounds: { x?: number; y?: number; width: number; height: number }
): void {
    const current = store.get('windowBounds');
    current[windowType] = bounds;
    store.set('windowBounds', current);
}

/**
 * Get window bounds for a specific window
 */
export function getWindowBounds(windowType: 'standard' | 'hud'): { x?: number; y?: number; width: number; height: number } {
    return store.get('windowBounds')[windowType];
}
