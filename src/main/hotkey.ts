/**
 * Gemini Desktop - Global Hotkey Management
 * 
 * Handles registration and cleanup of global keyboard shortcuts.
 */

import { globalShortcut } from 'electron';
import { toggleHUDWindow } from './windows/hud.js';

// Default hotkey configuration
const DEFAULT_HOTKEY = process.platform === 'darwin'
    ? 'CommandOrControl+Shift+G'
    : 'Ctrl+Shift+G';

/**
 * Register all global hotkeys
 * @returns true if all hotkeys registered successfully
 */
export function registerHotkeys(): boolean {
    let success = true;

    // Register HUD toggle hotkey
    const hudHotkeyRegistered = globalShortcut.register(DEFAULT_HOTKEY, () => {
        console.log('[Hotkey] Toggle HUD triggered');
        toggleHUDWindow();
    });

    if (hudHotkeyRegistered) {
        console.log(`[Hotkey] Registered: ${DEFAULT_HOTKEY}`);
    } else {
        console.error(`[Hotkey] Failed to register: ${DEFAULT_HOTKEY}`);
        console.error('[Hotkey] This may be because another application is using this shortcut');
        success = false;
    }

    return success;
}

/**
 * Unregister all global hotkeys
 */
export function unregisterHotkeys(): void {
    globalShortcut.unregisterAll();
    console.log('[Hotkey] Unregistered all shortcuts');
}

/**
 * Check if HUD hotkey is registered
 */
export function isHotkeyRegistered(): boolean {
    return globalShortcut.isRegistered(DEFAULT_HOTKEY);
}

/**
 * Get the current hotkey accelerator string
 */
export function getHotkeyAccelerator(): string {
    return DEFAULT_HOTKEY;
}
