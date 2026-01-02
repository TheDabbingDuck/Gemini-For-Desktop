/**
 * Gemini Desktop - Settings Store
 * 
 * Persistent settings storage using electron-store.
 * Automatically handles first-load edge cases by creating
 * config file with defaults if it doesn't exist.
 */

import Store from 'electron-store';
import { screen } from 'electron';

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
export const defaults: Settings = {
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
 * Ensure bounds are visible on some display
 * If not, return defaults
 */
export function ensureVisibleBounds(
    bounds: { x?: number; y?: number; width: number; height: number },
    defaults: { width: number; height: number }
): { x?: number; y?: number; width: number; height: number } {
    // If no position saved, return defaults (let OS center it)
    if (bounds.x === undefined || bounds.y === undefined) {
        return { ...defaults, x: undefined, y: undefined };
    }

    // Check if the window is reachable on any display
    const displays = screen.getAllDisplays();
    const isVisible = displays.some(display => {
        const db = display.bounds;
        // Simple check: is the top-left corner within this display?
        // Or at least some significant portion?
        // Let's check if the center of the window is within the display
        const centerX = bounds.x! + (bounds.width / 2);
        const centerY = bounds.y! + (bounds.height / 2);

        return (
            centerX >= db.x &&
            centerX < (db.x + db.width) &&
            centerY >= db.y &&
            centerY < (db.y + db.height)
        );
    });

    if (isVisible) {
        return bounds;
    } else {
        console.log('[Store] Window off-screen, resetting to defaults');
        return { ...defaults, x: undefined, y: undefined };
    }
}

/**
 * Get window bounds for a specific window with safety check
 */
export function getWindowBounds(windowType: 'standard' | 'hud'): { x?: number; y?: number; width: number; height: number } {
    const saved = store.get('windowBounds')[windowType];
    const defaultBounds = defaults.windowBounds[windowType];
    return ensureVisibleBounds(saved, defaultBounds);
}
