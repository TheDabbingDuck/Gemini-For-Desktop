/**
 * Onboarding page JavaScript
 */

const dismissBtn = document.getElementById('dismissBtn') as HTMLButtonElement;
const dontShowAgainBtn = document.getElementById('dontShowAgainBtn') as HTMLButtonElement;
const customizeHotkeyBtn = document.getElementById('customizeHotkeyBtn') as HTMLButtonElement;
const hotkeyText = document.getElementById('hotkeyText') as HTMLSpanElement;

/**
 * Format accelerator for display (make it more readable with kbd tags)
 */
function formatHotkeyDisplay(accelerator: string): string {
    const formatted = accelerator
        .replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');
    // Split into parts and wrap each in kbd
    return formatted.split('+').map(part => `<kbd>${part}</kbd>`).join('+');
}

/**
 * Load and display current hotkey
 */
async function loadHotkey(): Promise<void> {
    const hotkey = await window.onboardingAPI.getHotkey();
    hotkeyText.innerHTML = formatHotkeyDisplay(hotkey);
}

// Event listeners
dismissBtn.addEventListener('click', () => {
    window.onboardingAPI.dismiss();
});

dontShowAgainBtn.addEventListener('click', () => {
    window.onboardingAPI.dontShowAgain();
});

customizeHotkeyBtn.addEventListener('click', () => {
    window.onboardingAPI.openSettings();
});

// Load hotkey on page load
loadHotkey();

