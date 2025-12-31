# Gemini Desktop - OAuth Architecture Analysis

> **Date:** December 30, 2025  
> **Status:** ANALYSIS COMPLETE - Architecture Decision Required

---

## Problem Statement

Google actively blocks embedded browser authentication (including Electron with UA spoofing). When users try to sign in via the embedded BrowserWindow, they receive:

> "Couldn't sign you in - This browser or app may not be secure"

This is a firm Google policy as of 2024/2025, compliant with RFC8252 (OAuth 2.0 for Native Apps).

---

## Architecture Options

### Option A: External Browser OAuth + Cookie Sync (Complex)

**Flow:**
1. User clicks "Sign in" in Electron app
2. App opens system browser to Google OAuth consent page
3. User authenticates in their browser
4. Google redirects to `gemini-desktop://callback?code=...`
5. Electron intercepts via custom protocol handler
6. Exchange code for tokens

**Challenge:** This gives us OAuth tokens, but Gemini's web app uses HTTP-only cookies, not API tokens. We'd need to somehow convert tokens to a web session.

**Verdict:** ❌ Complex and may not work for web app auth

---

### Option B: Use Gemini API Instead of Web Wrapper (Recommended)

**Approach:** Instead of wrapping gemini.google.com web UI, build a native UI that calls the official Gemini API.

**Flow:**
1. User provides API key OR goes through OAuth flow
2. App stores credentials securely via `electron-store`
3. App provides custom chat UI
4. API calls go directly to Gemini API

**Pros:**
- Works reliably, officially supported
- No cookie/session issues
- Full control over UX
- Can add features not in web UI

**Cons:**
- Need to build chat UI (not a web wrapper)
- Different product scope
- API usage may have costs

**Verdict:** ✅ Most reliable solution, but changes product scope

---

### Option C: Hybrid - OAuth for API, Web View for UI

**Approach:** Keep the web wrapper but use OAuth to get credentials that might work.

**Flow:**
1. Use OAuth to get user's Google identity
2. Attempt to inject authentication into the web session
3. Fall back to "please sign in via your browser" message if it fails

**Verdict:** ⚠️ Worth trying, but may be fragile

---

### Option D: Accept Limitation + Manual Browser Sign-in

**Approach:** Accept that embedded sign-in doesn't work; guide users through alternative.

**Flow:**
1. App loads gemini.google.com
2. When sign-in is needed, show message: "Please complete sign-in in the popup"
3. Open Google sign-in in a SEPARATE, larger BrowserWindow (some users report this works better)
4. After sign-in completes, redirect back to gemini.google.com in main window

**Note:** Some Electron apps like GeminiDesk reportedly just load the web UI and let users sign in despite the warning - success may depend on specific Google account settings.

**Verdict:** ⚠️ Simple but may not work for all users

---

## Recommended Architecture: Option D + Fallback

Given the project goal of wrapping gemini.google.com, I recommend:

### Primary: Separate Sign-in Window

```
┌─────────────────────────────────────────┐
│ User clicks "Sign in"                   │
│              ↓                          │
│ Open NEW BrowserWindow (not main)       │
│ Navigate to accounts.google.com         │
│              ↓                          │
│ User signs in (may see warning)         │
│              ↓                          │
│ On success, close sign-in window        │
│ Reload main window to gemini.google.com │
│              ↓                          │
│ Session cookies shared (same partition) │
└─────────────────────────────────────────┘
```

**Why this might work:**
- Using a separate, standard-looking window (not frameless HUD)
- Full size, non-transparent, looks more like a "real" browser
- Some users report Google allows sign-in in certain Electron configurations

### Fallback: External Browser Instructions

If the above fails, provide clear instructions:
1. "Sign in to gemini.google.com in Chrome"
2. "Return to this app after signing in"
3. On return, check if session exists

---

## Implementation Changes Needed

### Phase 1 (Revised): Authentication

1. **Detect sign-in state** - Check if cookies exist for google.com
2. **New sign-in window** - Create dedicated auth window with specific settings
3. **Monitor auth success** - Detect when gemini.google.com loads authenticated
4. **Fallback UI** - If blocked, show instructions to use external browser

### New File: `src/main/windows/signIn.ts`

```typescript
// Dedicated sign-in window with browser-like settings
const signInWindow = new BrowserWindow({
  width: 480,
  height: 640,
  frame: true,           // Important: looks like real browser
  transparent: false,    // Important: not suspicious
  webPreferences: {
    partition: SESSION_PARTITION,
    contextIsolation: true
  }
});

signInWindow.loadURL('https://accounts.google.com/signin');
```

### Monitor for Success

```typescript
signInWindow.webContents.on('did-navigate', (e, url) => {
  // If we end up on gemini.google.com or myaccount.google.com, sign-in succeeded
  if (url.includes('gemini.google.com') || url.includes('myaccount.google.com')) {
    signInWindow.close();
    mainWindow.reload();
  }
});
```

---

## Testing Plan

1. **Test A:** Create sign-in window, attempt Google sign-in
   - If works ✅ → Proceed with this architecture
   - If blocked ❌ → Implement fallback UI

2. **Test B:** If Test A fails, try additional WebPreferences:
   - `webviewTag: false`
   - Different partition settings
   - Minimal preload script

3. **Test C:** If all else fails, implement external browser fallback

---

## Next Steps

1. Update implementation plan with revised Phase 1
2. Implement sign-in window approach
3. Test authentication
4. Implement fallback if needed

---

## Decision Required

**Question for user:** Do you want to:

**A)** Try the separate sign-in window approach first (simplest, may work)

**B)** Pivot to Gemini API-based app (different product, more work, definitely works)

**C)** Try both - sign-in window first, API fallback if it fails
