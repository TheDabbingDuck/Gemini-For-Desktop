/**
 * Gemini Desktop - Authentication & Header Spoofing
 * 
 * This module handles User-Agent and client hints spoofing to allow
 * Google sign-in to work within the Electron wrapper.
 * 
 * CRITICAL: This is the highest-risk component. Google may block sign-in
 * if the headers don't match a real Chrome browser closely enough.
 */

import { Session } from 'electron';

// Chrome 130 User-Agent (matches Electron 39's Chromium version)
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Client hints headers
const CLIENT_HINTS = {
    'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Full-Version-List': '"Chromium";v="130.0.0.0", "Google Chrome";v="130.0.0.0"'
};

/**
 * Set up request header interception to spoof Chrome's User-Agent
 * and client hints for Google domains.
 */
export function setupAuthInterception(ses: Session): void {
    ses.webRequest.onBeforeSendHeaders(
        { urls: ['*://*.google.com/*', '*://accounts.google.com/*'] },
        (details, callback) => {
            // Spoof User-Agent
            details.requestHeaders['User-Agent'] = CHROME_UA;

            // Spoof all client hints headers
            for (const [key, value] of Object.entries(CLIENT_HINTS)) {
                details.requestHeaders[key] = value;
            }

            callback({ requestHeaders: details.requestHeaders });
        }
    );

    // Also set the default User-Agent for the session
    ses.setUserAgent(CHROME_UA);

    console.log('[Auth] Header spoofing enabled for Google domains');
}

/**
 * Check if credentials are expired (401/403 response)
 * This can be used to detect when re-authentication is needed.
 */
export function setupAuthErrorDetection(ses: Session, onAuthError: () => void): void {
    ses.webRequest.onCompleted(
        { urls: ['*://*.google.com/*'] },
        (details) => {
            if (details.statusCode === 401 || details.statusCode === 403) {
                console.log('[Auth] Detected auth error:', details.statusCode);
                onAuthError();
            }
        }
    );
}
