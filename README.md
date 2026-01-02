# ✨ Gemini for Desktop

> **The unofficial desktop app for Google Gemini.**  
> Because Google hasn't made one yet. And I really like the ChatGPT for Desktop App.

Gemini for Desktop wraps the full [gemini.google.com](https://gemini.google.com) experience in a native app with some handy extras:

- 🚀 **Global Hotkey** — Summon Gemini instantly with `Ctrl+Shift+G` (customizable), no matter what you're doing.
- 🖼️ **Floating HUD Mode** — A compact, always-on-top window for quick questions.
- 🔔 **System Tray** — Runs quietly in the background, always one click away.
- 🔄 **Auto-Updates** — Get the latest features automatically.

---

## 📥 Installation (Windows)

1.  **Download** the latest `.exe` from the [Releases page](../../releases/latest).
2.  **Run the installer. (See warning below)**

### ⚠️⚠️⚠️ "Windows Protected Your PC" Warning ⚠️⚠️⚠️

Since this app isn't signed with an expensive Microsoft certificate, Windows SmartScreen will show a scary blue warning. Don't worry, it's safe (and open source, so you can check it yourself).

1.  Click **"More info"** (it's a small link, easy to miss).
2.  Click **"Run anyway"**.

That's it! You're in. Check out [How to Use](#how-to-use).

---

## 🍎 macOS Support

**Coming Soon!**  
I don't have a Mac to build on right now. If you'd like to contribute, check out [For Developers](#for-developers).

---

## How to Use

1.  **Launch** the app. Sign in with your Google account (follow instructions in the browser that opens).
2.  **Press `Ctrl+Shift+G`** to summon the floating HUD from anywhere.
3.  **Press `Ctrl+Shift+G` again** to dismiss it.
4.  (Optional but recommended) Right-click the taskbar icon and pin it to the taskbar.
5.  **Right-click the task tray icon** to change settings or quit.


> **Tip:** You can customize the hotkey in Settings!

---

## ❓ FAQ

**Is this an official Google app?**  
Nope! This is an independent, open-source project. It just wraps the official Gemini website and provides feature parity with the (official) ChatGPT for Desktop app, but for Gemini instead.

**Is it safe?**  
Yes. It's open source, and you can see all the code right here. Read it, or don't 🤷‍♂️.

**Why does Windows warn me about it?**  
Code signing certificates cost hundreds of dollars a year. This is a free project, and I'm a college student, so I don't have one. The warning is just Windows being cautious.

---

## For Developers

Want to contribute or run it yourself?

### Prerequisites
- Node.js 22.12+
- npm 10+

### Setup
```bash
git clone https://github.com/TheDabbingDuck/Gemini-For-Desktop.git
cd Gemini-For-Desktop
npm install
npm run dev
```

### Building
```bash
# Windows
npm run package:win

# macOS (requires a Mac)
npm run package:mac

# macOS Intel (requires an Intel Mac)
npm run package:mac-intel
```

---

## 📄 License

MIT
