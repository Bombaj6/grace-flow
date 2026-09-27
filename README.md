# 🕊️ Grace Flow — Church Countdown & Service System

**Grace Flow** is a live church countdown, clock, and service run-of-show management system built for church production teams, broadcast booths, and stage confidence monitors.

---

## ✨ Features

- **3 Display Modes**:
  - **Digital Countdown**: High-contrast, scalable digital clock (HH:MM:SS or MM:SS) that fills projection screens and LED video walls.
  - **Analog Clock Sweep**: Circular dial with smooth sweep hands and remaining-time radial arc.
  - **Time of Day Clock**: Normal clock time mode (e.g. 7:30 AM / 12h & 24h) with live date.
- **Dynamic Perimeter Warning Border**:
  - Wraps the entire edge of the screen and changes color dynamically:
    - 🟢 **Green**: Normal running (>20% remaining).
    - 🟡 **Amber / Yellow**: Warning threshold (≤5 mins or ≤20% remaining).
    - 🔴 **Red**: Urgent threshold (≤1 min or ≤5% remaining).
    - 🚨 **Flashing "TIME'S UP" Alert**: When time expires, it stops at `00:00` and displays a bold flashing **"TIME'S UP"** visual alert (no overtime count-up).
- **Stage Alert & Note Overlay**:
  - Discreetly display prompts or notes to the speaker (e.g., *"Wrap up in 2 mins"*, *"Mic 2 is live"*, *"Please dismiss"*).
  - Attention pulse animation toggle and 1-click dismiss.
- **Church Program Schedule (Run of Show)**:
  - Add items with custom minutes.
  - HTML5 drag-and-drop reordering.
  - **"▶ Cue & Start"** (instant live cue) and **"Cue Standby"** buttons.
  - Live active item indicator with runtime summary.
- **Saved Schedule Drafts & Templates**:
  - Save any service arrangement as a named template (e.g., "Sunday Morning", "Midweek Prayer", "Youth Service").
  - 1-click template loader and draft manager.
  - Persistent disk storage in `data/templates.json` and `data/schedule.json`.
- **Dual-Screen & Extend Support**:
  - **"Send to Second Screen"** button to project the clean timer window directly onto an external display or projector in fullscreen.
- **NDI & Network Broadcasting**:
  - Built-in local HTTP server: any iPad, phone, or monitor on the same Wi-Fi can view the timer via `http://<your-ip>:3000/stage`.
  - **OBS Studio / vMix / ProPresenter Browser Source** with 100% transparent background support (`/stage?transparent=true`).
  - Compatible with **NewTek NDI Screen Capture** for native NDI output.
- **Theme Suite**:
  - 🌙 **Dark Mode** (sleek church tech UI with indigo/purple accents).
  - ☀️ **Light Mode** (high-contrast daytime booth mode).
  - ⬛ **OLED / True Black Mode** (pure black for LED walls to eliminate backlight bleed).

---

## 🚀 Quick Start

### 1-Click Launch:
- **On Mac**: Double-click `start.command` in the project folder.
- **On Windows**: Double-click `start.bat` in the project folder.
It starts the server and opens the Operator Control Panel in your default browser automatically.

### Or via Terminal / Command Prompt:
```bash
npm start
```
Then open:
- **Operator Control Panel**: [http://localhost:3000](http://localhost:3000)
- **Stage / Projector Output**: [http://localhost:3000/stage](http://localhost:3000/stage)

---

## 🌐 Best Ways to Push This Out (Deployment Options)

Depending on your church's tech setup, here are the 4 recommended distribution paths:

### Option 1: Local Network Deployment (Recommended for In-House Church Services)
- **Zero Internet Needed**: Runs 100% offline inside the sanctuary or media booth.
- Run Grace Flow on your primary media computer (Mac or PC) via `start.command` or `start.bat`.
- Any phone, iPad, tablet, or stage display connected to the church Wi-Fi can open `http://<media-computer-ip>:3000/stage` without installing anything.

### Option 2: Free Cloud Hosting (Best for Remote / Multi-Campus Access)
- Deploy to platforms like **Render**, **Railway**, or **Fly.io** with 1 click from GitHub.
- Gives you a public URL (e.g. `https://graceflow.onrender.com`) accessible from anywhere by pastors, stage managers, and remote volunteers.

### Option 3: GitHub Open Source / Release ZIP
- Push the repository to GitHub.
- Tag a release (e.g. `v1.0.0`) and attach a pre-zipped bundle (`GraceFlow-v1.0.zip`).
- Volunteers can simply download the ZIP, extract it, and double-click `start.command` (Mac) or `start.bat` (Windows).

### Option 4: Standalone Desktop App (Electron / Tauri)
- Wrap the project into a native `.dmg` (Mac) or `.exe` (Windows) using Electron or Tauri for a native dock/taskbar icon.

---

## 🖥️ Sending to Second Screen (Extend)

1. Connect your projector, TV, or stage monitor to your computer and configure display settings to **"Extended Display"** (not Mirror).
2. On the Operator Control Panel, click **"🖥️ Send to Second Screen"**.
3. The clean stage display will open. Drag it to your secondary screen (if not automatically positioned) and **double-click anywhere** on the stage screen to enter true fullscreen.

---

## 📡 NDI, OBS Studio & vMix Setup

1. In Grace Flow, navigate to the **"Settings & NDI Deck"**.
2. **For OBS Studio / vMix**:
   - Copy the *OBS Browser Source URL* (e.g. `http://192.168.0.143:3000/stage?transparent=true`).
   - Add a new **Browser Source** in OBS / vMix, paste the URL, set resolution to `1920x1080`.
   - The timer will appear with a transparent background that you can overlay on live video feeds!
3. **For Native NDI**:
   - Open **NewTek NDI Screen Capture** (part of the free NewTek NDI Tools).
   - Select the Grace Flow stage window to broadcast it as an NDI device across your network to TriCaster, Wirecast, or stage decoders.

---

## ⌨️ Operator Shortcuts

- <kbd>Space</kbd>: Start / Pause Countdown
- <kbd>R</kbd>: Reset Timer to Beginning
- <kbd>N</kbd>: Cue & Start Next Scheduled Item
- <kbd>B</kbd>: Toggle Stage Blackout
- Double-Click (on Stage Screen): Toggle Fullscreen

---

## 👨🏾‍💻 Built By & Credits

**Grace Flow** was designed, architected, and built by:
- **Lead Creator**: Peter Olatunji
- **Instagram**: [@\_mayowapeter](https://instagram.com/_mayowapeter)

---

## 🔄 Updates & Upgrades

- **On Render (Web Version)**: Whenever you push new code to your connected GitHub repository (`git push origin main`), Render automatically detects the changes and redeploys the updated version in ~60 seconds with zero downtime!
- **On Desktop App**: Grace Flow includes an in-app **"🔄 Check for Updates"** tool in the **Settings Deck** that checks for new releases so users always know when a new version is available.


