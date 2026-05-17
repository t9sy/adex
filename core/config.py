"""
Konfigurations-Manager.
Lädt und speichert Einstellungen aus config.json.
API-Keys werden mit Fernet (AES-128-CBC) verschlüsselt gespeichert.
"""

import json
import base64
import os
import hashlib
from pathlib import Path
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken


class ConfigManager:
    """Verwaltung der Adex-Konfiguration."""

    DEFAULT_CONFIG = {
        "api_key_encoded": "",
        "system_prompt": (
            "Du bist Adex, ein intelligenter und hilfsbreiter KI-Assistent. "
            "Du antwortest präzise, freundlich und hilfreich. "
            "Wenn du Code schreibst, nutze Markdown-Code-Blöcke mit Sprachangabe."
        ),
        "temperature": 0.7,
        "max_tokens": 2048,
        "max_history": 20,
        "theme": "dark",
        "language": "de",
        "hotkey": "ctrl+shift+a",
        "always_on_top": False,
        "start_minimized": False,
        "clipboard_monitor": False,
        "news_feeds": {
            "Tagesschau": "https://www.tagesschau.de/xml/rss2/",
            "Heise": "https://www.heise.de/rss/heise-atom.xml",
            "BBC News": "http://feeds.bbci.co.uk/news/rss.xml",
        },
        "mini_mode_width": 500,
        "mini_mode_height": 60,
        "window_width": 1200,
        "window_height": 800,
    }

    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            config_path = str(data_dir / "config.json")
        self.config_path = config_path
        self.config: dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        """Konfiguration aus Datei laden oder Standardwerte verwenden."""
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                # Standard-Werte mit gespeicherten Werten zusammenführen
                self.config = {**self.DEFAULT_CONFIG, **saved}
            except (json.JSONDecodeError, IOError):
                self.config = dict(self.DEFAULT_CONFIG)
        else:
            self.config = dict(self.DEFAULT_CONFIG)
            self.save()

    def save(self) -> None:
        """Konfiguration in Datei speichern."""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Fehler beim Speichern der Konfiguration: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        """Einstellung lesen."""
        return self.config.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Einstellung setzen und speichern."""
        self.config[key] = value
        self.save()

    # --- API-Key-Verwaltung (Fernet-verschlüsselt) ---

    def _get_fernet_key(self) -> bytes:
        """Maschinengebundenen Fernet-Schlüssel ableiten."""
        machine_id = f"{os.getlogin()}@{os.path.expanduser('~')}"
        key_hash = hashlib.sha256(machine_id.encode("utf-8")).digest()
        return base64.urlsafe_b64encode(key_hash)

    def set_api_key(self, api_key: str) -> None:
        """API-Key verschlüsselt speichern (Fernet/AES)."""
        fernet = Fernet(self._get_fernet_key())
        encrypted = fernet.encrypt(api_key.encode("utf-8")).decode("utf-8")
        self.set("api_key_encrypted", encrypted)
        # Altes base64-Feld entfernen falls vorhanden
        if "api_key_encoded" in self.config:
            del self.config["api_key_encoded"]
            self.save()

    def get_api_key(self) -> str:
        """API-Key entschlüsseln und zurückgeben."""
        # Neues Fernet-Format
        encrypted = self.config.get("api_key_encrypted", "")
        if encrypted:
            try:
                fernet = Fernet(self._get_fernet_key())
                return fernet.decrypt(encrypted.encode("utf-8")).decode("utf-8")
            except (InvalidToken, Exception):
                return ""
        # Rückwärtskompatibilität: altes base64-Format migrieren
        encoded = self.config.get("api_key_encoded", "")
        if encoded:
            try:
                key = base64.b64decode(encoded.encode("utf-8")).decode("utf-8")
                if key:
                    self.set_api_key(key)
                    return key
            except Exception:
                pass
        return ""

    def has_api_key(self) -> bool:
        """Prüfen ob ein API-Key konfiguriert ist."""
        return bool(self.get_api_key())

    # --- Theme ---

    def get_theme(self) -> str:
        """Aktives Theme zurückgeben ('dark', 'light', 'system')."""
        return self.config.get("theme", "dark")

    def set_theme(self, theme: str) -> None:
        """Theme setzen."""
        if theme in ("dark", "light", "system"):
            self.set("theme", theme)

    # --- Komfort-Methoden ---

    def get_system_prompt(self) -> str:
        """System-Prompt abrufen."""
        return self.config.get("system_prompt", self.DEFAULT_CONFIG["system_prompt"])

    def get_temperature(self) -> float:
        """Temperatur-Einstellung abrufen."""
        return float(self.config.get("temperature", 0.7))

    def get_max_tokens(self) -> int:
        """Max-Tokens-Einstellung abrufen."""
        return int(self.config.get("max_tokens", 2048))

    def get_max_history(self) -> int:
        """Max-History-Einstellung abrufen."""
        return int(self.config.get("max_history", 20))

    def is_always_on_top(self) -> bool:
        """Always-on-Top-Einstellung prüfen."""
        return bool(self.config.get("always_on_top", False))

    def reset_to_defaults(self) -> None:
        """Alle Einstellungen auf Standardwerte zurücksetzen (API-Key bleibt erhalten)."""
        api_key = self.config.get("api_key_encoded", "")
        self.config = dict(self.DEFAULT_CONFIG)
        self.config["api_key_encoded"] = api_key
        self.save()
