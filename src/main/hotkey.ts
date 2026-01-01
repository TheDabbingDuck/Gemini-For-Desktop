/**
 * Gemini Desktop - Global Hotkey Management
 * 
 * Handles registration and cleanup of global keyboard shortcuts.
 * Supports customizable hotkeys stored in electron-store.
 */

import { globalShortcut } from 'electron';
import { toggleHUDWindow } from './windows/hud.js';
import { getSetting, setSetting } from './store.js';

// Track currently registered hotkey
let currentHotkey: string | null = null;

/**
 * Get the default hotkey (cross-platform)
 */
export function getDefaultHotkey(): string {
    return 'CommandOrControl+Shift+G';
}

/**
 * Register the HUD toggle hotkey from settings
 * @returns true if registered successfully
 */
export function registerHotkeys(): boolean {
    const hotkey = getSetting('hotkey') || getDefaultHotkey();
    return registerHotkeyInternal(hotkey);
}

/**
 * Internal function to register a specific hotkey
 */
function registerHotkeyInternal(hotkey: string): boolean {
    // Unregister current hotkey if exists
    if (currentHotkey && globalShortcut.isRegistered(currentHotkey)) {
        globalShortcut.unregister(currentHotkey);
    }

    const success = globalShortcut.register(hotkey, () => {
        console.log('[Hotkey] Toggle HUD triggered');
        toggleHUDWindow();
    });

    if (success) {
        currentHotkey = hotkey;
        console.log(`[Hotkey] Registered: ${hotkey}`);
    } else {
        console.error(`[Hotkey] Failed to register: ${hotkey}`);
        console.error('[Hotkey] This may be because another application is using this shortcut');
    }

    return success;
}

/**
 * Update the hotkey - unregister old, register new, save to store
 * @returns true if new hotkey registered successfully
 */
export function updateHotkey(newHotkey: string): boolean {
    const success = registerHotkeyInternal(newHotkey);
    if (success) {
        setSetting('hotkey', newHotkey);
        console.log(`[Hotkey] Updated to: ${newHotkey}`);
    }
    return success;
}

/**
 * Unregister all global hotkeys
 */
export function unregisterHotkeys(): void {
    globalShortcut.unregisterAll();
    currentHotkey = null;
    console.log('[Hotkey] Unregistered all shortcuts');
}

/**
 * Check if HUD hotkey is registered
 */
export function isHotkeyRegistered(): boolean {
    return currentHotkey !== null && globalShortcut.isRegistered(currentHotkey);
}

/**
 * Get the current hotkey accelerator string
 */
export function getHotkeyAccelerator(): string {
    return currentHotkey || getSetting('hotkey') || getDefaultHotkey();
}

