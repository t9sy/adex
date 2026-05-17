---
name: testing-adex
description: Test the Adex PyQt6 desktop AI assistant end-to-end. Use when verifying UI, views, CRUD operations, or API integration changes.
---

# Testing Adex Desktop App

## Environment Setup

1. Install dependencies:
   ```bash
   cd /home/ubuntu/repos/adex
   pip install -r requirements.txt
   ```
2. Verify X11 display is available: `echo $DISPLAY` should return `:0`
3. Install wmctrl for window management: `sudo apt-get install -y wmctrl`

## Launching the App

```bash
cd /home/ubuntu/repos/adex
python3 main.py 2>&1 &
sleep 2
wmctrl -r "Adex" -b add,maximized_vert,maximized_horz
```

- The `keyboard` module requires root on Linux and will be gracefully disabled. This is expected — the global hotkey (Ctrl+Shift+A) and mini overlay won't work on Linux but are designed for Windows.
- The app prints `Info: 'keyboard'-Modul nicht verfügbar. Globaler Hotkey deaktiviert.` on Linux — this is normal.

## Test Procedures

### Views to Test (sidebar navigation)
1. **Chat** — Default view. Welcome message from Adex should appear. Sending a message without API key should show German error about missing key. "+ Neuer Chat" button should clear conversation.
2. **Web-Suche** — Search input with "Suchen" and "Wikipedia" buttons. Wikipedia queries return German Wikipedia results.
3. **News** — Feed dropdown (Tagesschau, Heise, BBC, etc.) with "Laden" button. Loading fetches real RSS articles.
4. **System** — Three metric cards (CPU, RAM, Festplatte) with progress bars. Process table with PID, Name, CPU%, RAM%, Status.
5. **Notizen** — Create note with title + content, click "Speichern". Note appears in list with timestamp. Data persisted in SQLite.
6. **Aufgaben** — "+ Neue Aufgabe" opens input dialog. Task appears with "○" status. Clicking status toggles to completed (strikethrough).
7. **Einstellungen** — API key input, system prompt textarea, temperature/max_tokens spinboxes, theme dropdown, checkboxes.

### Features Requiring API Key
- Streaming AI chat responses
- KI-Zusammenfassung (news and notes)
- KI-Priorisierung (tasks)
- "Ergebnis an KI-Chat senden" (web search)

### Features Requiring Windows
- Global hotkey (Ctrl+Shift+A) via `keyboard` module
- Mini overlay window (triggered by hotkey)
- PyInstaller .exe build (`pyinstaller build.spec`)
- `os.startfile()` in file_ops.py

## Known Issues

- **Clipboard monitor thread safety** — The callback fires from a background thread but updates Qt widgets directly. May crash when enabled.
- **API key storage** — Uses base64 encoding (not real encryption). Trivially reversible.
- **Single-instance lock** — Lock file path is created but never checked/written.

## Devin Secrets Needed

- `NVIDIA_NIM_API_KEY` — For testing AI chat streaming, KI-Zusammenfassung, and KI-Priorisierung features. Get a free key at https://build.nvidia.com/nim
