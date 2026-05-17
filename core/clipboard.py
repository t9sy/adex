"""
Clipboard-Monitor-Modul.
Überwacht die Zwischenablage und ermöglicht Textanalyse.
Thread-sicher durch Qt Signal/Slot-Mechanismus.
"""

import threading
import time
from typing import Callable, Optional

import pyperclip
from PyQt6.QtCore import QObject, pyqtSignal


class ClipboardSignalBridge(QObject):
    """Bridge für thread-sichere Clipboard-Benachrichtigungen."""
    clipboard_changed = pyqtSignal(str)


class ClipboardMonitor:
    """Zwischenablage überwachen und kopierten Text verarbeiten (thread-sicher)."""

    def __init__(self):
        self._monitoring = False
        self._thread: Optional[threading.Thread] = None
        self._last_content = ""
        self._poll_interval = 1.0
        self._signal_bridge = ClipboardSignalBridge()

    def get_clipboard(self) -> str:
        """Aktuellen Inhalt der Zwischenablage abrufen."""
        try:
            return pyperclip.paste()
        except Exception:
            return ""

    def set_clipboard(self, text: str) -> bool:
        """Text in die Zwischenablage kopieren."""
        try:
            pyperclip.copy(text)
            return True
        except Exception:
            return False

    def start_monitoring(self, callback: Callable[[str], None]) -> None:
        """
        Clipboard-Überwachung starten.
        callback wird thread-sicher über Qt-Signals aufgerufen.
        """
        if self._monitoring:
            return

        self._signal_bridge.clipboard_changed.connect(callback)
        self._monitoring = True
        self._last_content = self.get_clipboard()
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()

    def stop_monitoring(self) -> None:
        """Clipboard-Überwachung stoppen."""
        self._monitoring = False
        try:
            self._signal_bridge.clipboard_changed.disconnect()
        except (TypeError, RuntimeError):
            pass
        if self._thread:
            self._thread.join(timeout=3)
            self._thread = None

    def _monitor_loop(self) -> None:
        """Hintergrund-Schleife zur Clipboard-Überwachung."""
        while self._monitoring:
            try:
                current = self.get_clipboard()
                if current and current != self._last_content:
                    self._last_content = current
                    self._signal_bridge.clipboard_changed.emit(current)
            except Exception:
                pass
            time.sleep(self._poll_interval)

    @property
    def is_monitoring(self) -> bool:
        """Prüfen ob Überwachung aktiv ist."""
        return self._monitoring

    def analyze_clipboard_text(self, text: str) -> dict:
        """
        Einfache Analyse des Clipboard-Textes.
        Erkennt Typ und grundlegende Statistiken.
        """
        if not text:
            return {"type": "leer", "content": ""}

        text = text.strip()

        # URL erkennen
        if text.startswith(("http://", "https://", "www.")):
            return {
                "type": "url",
                "content": text,
                "suggestion": "Soll ich diese Webseite für dich zusammenfassen?",
            }

        # E-Mail erkennen
        if "@" in text and "." in text and len(text) < 100 and " " not in text:
            return {
                "type": "email",
                "content": text,
                "suggestion": "E-Mail-Adresse erkannt.",
            }

        # Code erkennen (einfache Heuristik)
        code_indicators = [
            "def ", "class ", "import ", "function ", "const ", "let ",
            "var ", "if (", "for (", "while (", "return ", "#include",
            "public ", "private ", "static ", "{", "};",
        ]
        code_score = sum(1 for ind in code_indicators if ind in text)
        if code_score >= 2:
            lines = text.count("\n") + 1
            return {
                "type": "code",
                "content": text,
                "lines": lines,
                "suggestion": "Code erkannt. Soll ich ihn erklären oder verbessern?",
            }

        # Normaler Text
        words = len(text.split())
        chars = len(text)
        lines = text.count("\n") + 1

        suggestion = ""
        if words > 50:
            suggestion = "Langer Text erkannt. Soll ich ihn zusammenfassen?"
        elif words > 10:
            suggestion = "Text erkannt. Soll ich ihn analysieren oder übersetzen?"

        return {
            "type": "text",
            "content": text,
            "words": words,
            "characters": chars,
            "lines": lines,
            "suggestion": suggestion,
        }
