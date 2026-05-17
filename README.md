# ⚡ Adex — KI-Desktop-Assistent

Ein intelligenter KI-Assistent für den alltäglichen Gebrauch auf Windows 10/11.

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![PyQt6](https://img.shields.io/badge/UI-PyQt6-green)
![NVIDIA NIM](https://img.shields.io/badge/KI-NVIDIA%20NIM-76b900)

## Features

- **KI-Chat** — Streaming-Antworten mit Markdown & Code-Highlighting (NVIDIA NIM / Llama 3.1 70B)
- **Web-Suche** — DuckDuckGo Instant Answers, Wikipedia, Webpage-Scraper
- **News** — RSS-Feeds (Tagesschau, Heise, BBC u.a.) mit KI-Zusammenfassung
- **System-Monitor** — CPU, RAM, Festplatte, Prozess-Manager
- **Notizen & Aufgaben** — Lokale SQLite-Datenbank mit KI-Zusammenfassung & Priorisierung
- **Globaler Hotkey** — `Strg+Shift+A` für Schnellzugriff (Mini-Overlay)
- **System-Tray** — Läuft im Hintergrund, immer erreichbar
- **Dark-Mode** — Glassmorphism-Design mit Neon-Blau-Akzenten

## Installation

### Voraussetzungen

- Python 3.11 oder neuer
- Windows 10/11 (x64)
- NVIDIA NIM API-Key (kostenlos)

### 1. Repository klonen

```bash
git clone https://github.com/t9sy/adex.git
cd adex
```

### 2. Abhängigkeiten installieren

```bash
pip install -r requirements.txt
```

### 3. NVIDIA NIM API-Key einrichten

1. Gehe zu [build.nvidia.com](https://build.nvidia.com/nim)
2. Erstelle einen kostenlosen Account
3. Navigiere zu **meta/llama-3.1-70b-instruct**
4. Klicke auf „Get API Key" und kopiere den Key
5. Starte Adex — beim ersten Start wirst du nach dem Key gefragt
6. Alternativ: Gib den Key unter **Einstellungen → API-Key** ein

### 4. Adex starten

```bash
python main.py
```

## Als .exe erstellen (Windows)

```bash
pyinstaller build.spec
```

Die fertige `Adex.exe` befindet sich dann im `dist/`-Ordner.

## Tastenkürzel

| Tastenkombination | Aktion |
|---|---|
| `Strg+Shift+A` | Adex öffnen/Mini-Overlay |
| `Enter` | Nachricht senden |
| `Shift+Enter` | Zeilenumbruch im Chat |
| `Esc` | Mini-Overlay schließen |

## Projektstruktur

```
adex/
├── main.py              # Entry Point, Tray-Icon, Hotkey
├── ui/
│   ├── main_window.py   # Haupt-UI (PyQt6)
│   ├── chat_widget.py   # Chat mit Streaming
│   ├── mini_overlay.py  # Kompakt-Modus
│   └── styles.qss       # Dark Theme StyleSheet
├── core/
│   ├── nim_client.py    # NVIDIA NIM API + Streaming
│   ├── web_search.py    # DuckDuckGo + Scraping
│   ├── news_reader.py   # RSS-Feed-Verarbeitung
│   ├── system_info.py   # System-Monitor (psutil)
│   ├── file_ops.py      # Datei-Operationen
│   ├── clipboard.py     # Clipboard-Überwachung
│   ├── database.py      # SQLite-Datenbank
│   └── config.py        # Konfigurationsverwaltung
├── data/
│   ├── adex.db          # SQLite (wird automatisch erstellt)
│   └── config.json      # Einstellungen
├── assets/
│   ├── icon.ico         # App-Icon
│   ├── icon.png         # App-Icon (PNG)
│   └── logo.svg         # Logo
├── requirements.txt
├── build.spec           # PyInstaller Konfiguration
└── README.md
```

## Konfiguration

Die Konfiguration wird in `data/config.json` gespeichert. Einstellungen können auch über die UI angepasst werden:

| Einstellung | Beschreibung | Standard |
|---|---|---|
| `theme` | Farbschema (dark/light/system) | `dark` |
| `temperature` | KI-Kreativität (0.0-1.0) | `0.7` |
| `max_tokens` | Max. Antwortlänge | `2048` |
| `max_history` | Kontext-Nachrichten | `20` |
| `hotkey` | Globaler Hotkey | `ctrl+shift+a` |
| `always_on_top` | Immer im Vordergrund | `false` |
| `clipboard_monitor` | Zwischenablage überwachen | `false` |

## API

Adex nutzt die **NVIDIA NIM API** mit dem Modell `meta/llama-3.1-70b-instruct`:
- Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- Kostenloses Tier verfügbar
- Streaming-Support für Token-für-Token-Ausgabe

## Lizenz

MIT License
