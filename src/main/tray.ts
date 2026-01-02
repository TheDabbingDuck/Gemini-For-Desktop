/**
 * Gemini Desktop - System Tray
 * 
 * Creates a system tray icon with context menu.
 * - Left-click: Show Standard Window
 * - Right-click: Context menu with all options
 */

import { Tray, Menu, app, nativeImage, MenuItemConstructorOptions } from 'electron';
import { showStandardWindow, getStandardWindow } from './windows/standard.js';
import { toggleHUDWindow, getHUDWindow } from './windows/hud.js';
import { getSetting } from './store.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tray reference
let tray: Tray | null = null;

/**
 * Create a placeholder tray icon (16x16 colored square)
 * Used until proper icons are provided
 */
function createPlaceholderIcon(): Electron.NativeImage {
    // Create a simple 16x16 blue square as placeholder
    // This is a base64-encoded 16x16 PNG with a gradient blue color
    const size = 16;

    // Try to load icon from resources first
    const iconPath = path.join(__dirname, '../../resources/tray-icon.png');
    try {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            console.log('[Tray] Loaded icon from resources');
            // On macOS, treat as template image (handles dark/light mode automatically)
            if (process.platform === 'darwin') {
                icon.setTemplateImage(true);
            }
            return icon;
        }
    } catch {
        // Fall through to placeholder
    }

    // Create a simple placeholder - a small blue/purple gradient square
    const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR4AWMYBaNgGABGIJ4PxP+h+D8Uz4diBwZSABMQ/wPi/1D8D4pJNgCI/4HxPyj+B8UkuwCI/0HxPyj+B8UMpAAmBgqAkQhNDCPSAEYiNDGMqADAAAD7BBX7a98jvQAAAABJRU5ErkJggg==';

    const icon = nativeImage.createFromDataURL(`data:image/png;base64,${placeholderBase64}`);
    console.log('[Tray] Using placeholder icon');
    return icon;
}

/**
 * Build the tray context menu with current window states
 */
function buildContextMenu(): Menu {
    // Check current window visibility
    const standardWindow = getStandardWindow();
    const hudWindow = getHUDWindow();

    const isStandardVisible = !!(standardWindow && !standardWindow.isDestroyed() && standardWindow.isVisible());
    const isHUDVisible = !!(hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible());

    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: 'Show Main Window',
            click: () => {
                console.log('[Tray] Show Main Window clicked');
                showStandardWindow();
            }
        },
        {
            label: 'Toggle HUD',
            type: 'checkbox',
            checked: isHUDVisible,
            accelerator: getSetting('hotkey') || (process.platform === 'darwin' ? 'CommandOrControl+Shift+G' : 'Ctrl+Shift+G'),
            click: () => {
                console.log('[Tray] Toggle HUD clicked');
                toggleHUDWindow();
                // Rebuild menu to update checkmark
                updateTrayMenu();
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                console.log('[Tray] Settings clicked');
                // Delayed import to avoid circular dependency
                import('./windows/settings.js').then(({ showSettingsWindow }) => {
                    showSettingsWindow();
                });
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : undefined,
            click: () => {
                console.log('[Tray] Quit clicked');
                app.quit();
            }
        }
    ];

    return Menu.buildFromTemplate(menuTemplate);
}

/**
 * Update tray menu (called when window visibility changes)
 */
export function updateTrayMenu(): void {
    if (tray) {
        const contextMenu = buildContextMenu();
        tray.setContextMenu(contextMenu);
    }
}

/**
 * Create and configure the system tray
 */
export function createTray(): Tray {
    const icon = createPlaceholderIcon();
    tray = new Tray(icon);

    // Set tooltip
    tray.setToolTip('Gemini Desktop');

    // Build and set context menu
    updateTrayMenu();

    // Left-click behavior: show Standard Window
    tray.on('click', () => {
        console.log('[Tray] Left-click - showing Standard Window');
        showStandardWindow();
        updateTrayMenu();
    });

    console.log('[Tray] Created system tray');
    return tray;
}

/**
 * Get the tray reference
 */
export function getTray(): Tray | null {
    return tray;
}

/**
 * Destroy the tray (cleanup)
 */
export function destroyTray(): void {
    if (tray) {
        tray.destroy();
        tray = null;
        console.log('[Tray] Destroyed');
    }
}

