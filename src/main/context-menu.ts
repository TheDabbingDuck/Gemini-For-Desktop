/**
 * Gemini Desktop - Context Menu
 * 
 * Provides right-click context menu for all windows, including:
 * - Spellcheck suggestions (when right-clicking a misspelled word)
 * - Standard editing actions (Cut, Copy, Paste, Paste as Plain Text, Select All)
 * - Link actions (Copy Link, Open in Browser)
 * - Image actions (Copy Image, Save Image)
 * 
 * Cross-platform: Uses Electron's built-in role-based menu items which
 * automatically adapt labels and keyboard shortcuts for each OS
 * (e.g. Cmd vs Ctrl on macOS/Windows).
 */

import { Menu, MenuItem, BrowserWindow, clipboard, shell } from 'electron';

/**
 * Set up context menu for a BrowserWindow's webContents.
 * Should be called after creating each BrowserWindow.
 */
export function setupContextMenu(win: BrowserWindow): void {
    win.webContents.on('context-menu', (_event, params) => {
        const menu = new Menu();

        // --- Spellcheck suggestions ---
        if (params.misspelledWord && params.dictionarySuggestions.length > 0) {
            for (const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => win.webContents.replaceMisspelling(suggestion)
                }));
            }
            menu.append(new MenuItem({ type: 'separator' }));

            // Add to dictionary
            menu.append(new MenuItem({
                label: `Add "${params.misspelledWord}" to Dictionary`,
                click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // --- Link actions ---
        if (params.linkURL) {
            menu.append(new MenuItem({
                label: 'Open Link in Browser',
                click: () => shell.openExternal(params.linkURL)
            }));
            menu.append(new MenuItem({
                label: 'Copy Link Address',
                click: () => clipboard.writeText(params.linkURL)
            }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // --- Image actions ---
        if (params.hasImageContents) {
            menu.append(new MenuItem({
                label: 'Copy Image',
                click: () => win.webContents.copyImageAt(params.x, params.y)
            }));
            if (params.srcURL) {
                menu.append(new MenuItem({
                    label: 'Save Image As…',
                    click: () => {
                        win.webContents.downloadURL(params.srcURL);
                    }
                }));
                menu.append(new MenuItem({
                    label: 'Open Image in Browser',
                    click: () => shell.openExternal(params.srcURL)
                }));
            }
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // --- Editable field actions ---
        if (params.isEditable) {
            menu.append(new MenuItem({
                label: 'Undo',
                role: 'undo',
                enabled: params.editFlags.canUndo
            }));
            menu.append(new MenuItem({
                label: 'Redo',
                role: 'redo',
                enabled: params.editFlags.canRedo
            }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({
                label: 'Cut',
                role: 'cut',
                enabled: params.editFlags.canCut
            }));
            menu.append(new MenuItem({
                label: 'Copy',
                role: 'copy',
                enabled: params.editFlags.canCopy
            }));
            menu.append(new MenuItem({
                label: 'Paste',
                role: 'paste',
                enabled: params.editFlags.canPaste
            }));
            menu.append(new MenuItem({
                label: 'Paste as Plain Text',
                role: 'pasteAndMatchStyle',
                enabled: params.editFlags.canPaste
            }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({
                label: 'Select All',
                role: 'selectAll',
                enabled: params.editFlags.canSelectAll
            }));
        } else if (params.selectionText) {
            // --- Non-editable selected text ---
            menu.append(new MenuItem({
                label: 'Copy',
                role: 'copy',
                enabled: params.editFlags.canCopy
            }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({
                label: 'Select All',
                role: 'selectAll'
            }));
        }

        // Only show the menu if it has items
        if (menu.items.length > 0) {
            menu.popup({ window: win });
        }
    });

    // Enable spellchecker
    win.webContents.session.setSpellCheckerLanguages(['en-US']);

    console.log('[ContextMenu] Registered for window');
}
