/**
 * Gemini Desktop - HUD Preload Script
 * 
 * This script runs in the HUD renderer context.
 * It handles:
 * - Escape key to hide HUD
 * - Focusing the Gemini input field
 * - Injecting the drag handle
 */

import { contextBridge, ipcRenderer } from 'electron';

// Focus the Gemini input field
function focusGeminiInput(): boolean {
    const selectors = [
        'div.ql-editor[contenteditable="true"]',           // Primary: Quill class
        'div[role="textbox"][contenteditable="true"]',     // Fallback: semantic
        'rich-textarea div[contenteditable="true"]'        // Fallback: component
    ];

    for (const selector of selectors) {
        const input = document.querySelector(selector) as HTMLElement | null;
        if (input) {
            input.focus();
            return true;
        }
    }
    return false;
}

// Inject drag handle at top of page
function injectDragHandle(): void {
    // Check if already injected
    if (document.getElementById('gemini-desktop-drag-handle')) {
        return;
    }

    const dragHandle = document.createElement('div');
    dragHandle.id = 'gemini-desktop-drag-handle';
    dragHandle.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 16px;
    -webkit-app-region: drag;
    z-index: 99999;
    background: linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, transparent 100%);
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  `;

    // Visual indicator
    const grabber = document.createElement('div');
    grabber.style.cssText = `
    width: 36px;
    height: 4px;
    background: rgba(128,128,128,0.5);
    border-radius: 2px;
    margin-top: 8px;
  `;
    dragHandle.appendChild(grabber);

    document.body.prepend(dragHandle);
}

// Set up when DOM is ready
function setup(): void {
    // Inject drag handle
    injectDragHandle();

    // Listen for Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ipcRenderer.send('hud:hide');
        }
    });

    // Focus input when requested
    ipcRenderer.on('focus-input', () => {
        // Small delay to ensure page is ready
        setTimeout(() => {
            focusGeminiInput();
        }, 100);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
} else {
    setup();
}

// Expose minimal API to renderer
contextBridge.exposeInMainWorld('geminiDesktop', {
    platform: process.platform,
    isHUD: true,
    hideHUD: () => ipcRenderer.send('hud:hide'),
    focusInput: focusGeminiInput
});
