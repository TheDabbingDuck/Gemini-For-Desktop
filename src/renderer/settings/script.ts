/**
 * Settings page JavaScript
 */

// DOM elements
const launchOnStartupCheckbox = document.getElementById('launchOnStartup') as HTMLInputElement;
const closeTrayRadio = document.getElementById('closeTray') as HTMLInputElement;
const closeQuitRadio = document.getElementById('closeQuit') as HTMLInputElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;

// Hotkey elements
const hotkeyDisplay = document.getElementById('hotkeyDisplay') as HTMLSpanElement;
const recordHotkeyBtn = document.getElementById('recordHotkeyBtn') as HTMLButtonElement;
const hotkeyRecording = document.getElementById('hotkeyRecording') as HTMLDivElement;
const cancelRecordBtn = document.getElementById('cancelRecordBtn') as HTMLButtonElement;

// Hotkey recording state
let isRecording = false;

/**
 * Convert keyboard event to Electron accelerator format
 */
function keyEventToAccelerator(e: KeyboardEvent): string | null {
    // Need at least one modifier
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        return null;
    }

    // Need a non-modifier key
    const modifierKeys = ['Control', 'Meta', 'Alt', 'Shift'];
    if (modifierKeys.includes(e.key)) {
        return null;
    }

    const parts: string[] = [];

    // Use CommandOrControl for cross-platform (Ctrl on Windows, Cmd on Mac)
    if (e.ctrlKey || e.metaKey) {
        parts.push('CommandOrControl');
    }
    if (e.altKey) {
        parts.push('Alt');
    }
    if (e.shiftKey) {
        parts.push('Shift');
    }

    // Convert key to Electron format
    let key = e.key;

    // Handle special keys
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === 'Escape') key = 'Escape';
    else if (key === 'Enter') key = 'Return';
    else if (key === 'Backspace') key = 'Backspace';
    else if (key === 'Delete') key = 'Delete';
    else if (key === 'Tab') key = 'Tab';

    parts.push(key);
    return parts.join('+');
}

/**
 * Format accelerator for display (make it more readable)
 */
function formatHotkeyDisplay(accelerator: string): string {
    return accelerator
        .replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
        .replace(/\+/g, ' + ');
}

/**
 * Start recording hotkey
 */
function startRecording(): void {
    isRecording = true;
    recordHotkeyBtn.parentElement!.style.display = 'none';
    hotkeyRecording.style.display = 'flex';
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Stop recording hotkey
 */
function stopRecording(): void {
    isRecording = false;
    recordHotkeyBtn.parentElement!.style.display = 'flex';
    hotkeyRecording.style.display = 'none';
    document.removeEventListener('keydown', handleKeyDown);
}

/**
 * Handle keydown during recording
 */
async function handleKeyDown(e: KeyboardEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();

    const accelerator = keyEventToAccelerator(e);
    if (!accelerator) return; // Not a valid combo yet

    // Try to set the hotkey
    const success = await window.settingsAPI.setHotkey(accelerator);

    if (success) {
        hotkeyDisplay.textContent = formatHotkeyDisplay(accelerator);
        stopRecording();
    } else {
        // Show error - hotkey couldn't be registered
        const prompt = hotkeyRecording.querySelector('.recording-prompt') as HTMLSpanElement;
        prompt.textContent = 'Hotkey unavailable. Try another...';
        prompt.style.color = '#ff6b6b';
        setTimeout(() => {
            prompt.textContent = 'Press your new hotkey combination...';
            prompt.style.color = '';
        }, 2000);
    }
}

/**
 * Load current settings into the form
 */
async function loadSettings(): Promise<void> {
    const settings = await window.settingsAPI.getSettings();

    launchOnStartupCheckbox.checked = settings.launchOnStartup;

    if (settings.closeBehavior === 'tray') {
        closeTrayRadio.checked = true;
    } else {
        closeQuitRadio.checked = true;
    }

    // Display hotkey
    hotkeyDisplay.textContent = formatHotkeyDisplay(settings.hotkey);
}

/**
 * Save current form values
 */
async function saveSettings(): Promise<void> {
    const settings = {
        launchOnStartup: launchOnStartupCheckbox.checked,
        closeBehavior: (closeTrayRadio.checked ? 'tray' : 'quit') as 'tray' | 'quit'
    };

    await window.settingsAPI.saveSettings(settings);
    window.settingsAPI.close();
}

/**
 * Reset to defaults
 */
async function resetSettings(): Promise<void> {
    const defaults = await window.settingsAPI.resetSettings();

    // Update form with defaults
    launchOnStartupCheckbox.checked = defaults.launchOnStartup;
    closeTrayRadio.checked = defaults.closeBehavior === 'tray';
    closeQuitRadio.checked = defaults.closeBehavior === 'quit';
    hotkeyDisplay.textContent = formatHotkeyDisplay(defaults.hotkey);
}

// Event listeners
closeBtn.addEventListener('click', () => window.settingsAPI.close());
resetBtn.addEventListener('click', resetSettings);
saveBtn.addEventListener('click', saveSettings);
recordHotkeyBtn.addEventListener('click', startRecording);
cancelRecordBtn.addEventListener('click', stopRecording);

// Load settings on page load
loadSettings();
