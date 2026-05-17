"""
Adex — KI-Desktop-Assistent für Windows
Entry Point: System-Tray, globaler Hotkey, Anwendungsstart.
"""

import sys
import os
import threading
from typing import Optional

from PyQt6.QtWidgets import QApplication, QSystemTrayIcon, QMenu
from PyQt6.QtGui import QIcon, QPixmap, QPainter, QColor, QAction
from PyQt6.QtCore import Qt, QTimer

from core.config import ConfigManager
from core.database import Database
from ui.main_window import MainWindow
from ui.mini_overlay import MiniOverlay


def create_default_icon() -> QIcon:
    """Standard-Icon erstellen falls kein Icon vorhanden."""
    pixmap = QPixmap(64, 64)
    pixmap.fill(QColor(0, 0, 0, 0))

    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)

    # Hintergrund-Kreis
    painter.setBrush(QColor(0, 212, 255))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(4, 4, 56, 56)

    # "A" Buchstabe
    painter.setPen(QColor(10, 14, 23))
    font = painter.font()
    font.setPixelSize(36)
    font.setBold(True)
    painter.setFont(font)
    painter.drawText(pixmap.rect(), Qt.AlignmentFlag.AlignCenter, "A")

    painter.end()
    return QIcon(pixmap)


class AdexApp:
    """Haupt-Anwendungsklasse für Adex."""

    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setApplicationName("Adex")
        self.app.setOrganizationName("Adex")
        self.app.setQuitOnLastWindowClosed(False)

        # Konfiguration und Datenbank initialisieren
        self.config = ConfigManager()
        self.database = Database()

        # Icon laden
        self.icon = self._load_icon()

        # Haupt-Fenster erstellen
        self.main_window = MainWindow(self.config, self.database)
        self.main_window.setWindowIcon(self.icon)

        # Mini-Overlay erstellen
        self.mini_overlay = MiniOverlay()
        self.mini_overlay.query_submitted.connect(self._on_mini_query)
        self.mini_overlay.close_requested.connect(self._hide_mini_overlay)

        # System-Tray einrichten
        self._setup_tray()

        # Globalen Hotkey einrichten
        self._setup_hotkey()

    def _load_icon(self) -> QIcon:
        """App-Icon laden oder Standard-Icon erstellen."""
        icon_path = os.path.join(os.path.dirname(__file__), "assets", "icon.ico")
        if os.path.exists(icon_path):
            return QIcon(icon_path)

        # PNG-Version versuchen
        png_path = os.path.join(os.path.dirname(__file__), "assets", "icon.png")
        if os.path.exists(png_path):
            return QIcon(png_path)

        return create_default_icon()

    def _setup_tray(self) -> None:
        """System-Tray-Icon und Menü einrichten."""
        self.tray = QSystemTrayIcon(self.icon, self.app)
        self.tray.setToolTip("Adex — KI-Desktop-Assistent")

        # Tray-Menü
        tray_menu = QMenu()

        show_action = QAction("Adex öffnen", self.app)
        show_action.triggered.connect(self._show_main_window)
        tray_menu.addAction(show_action)

        mini_action = QAction("Schnellzugriff (Strg+Shift+A)", self.app)
        mini_action.triggered.connect(self._toggle_mini_overlay)
        tray_menu.addAction(mini_action)

        tray_menu.addSeparator()

        new_chat_action = QAction("Neuer Chat", self.app)
        new_chat_action.triggered.connect(self._new_chat)
        tray_menu.addAction(new_chat_action)

        tray_menu.addSeparator()

        quit_action = QAction("Beenden", self.app)
        quit_action.triggered.connect(self._quit)
        tray_menu.addAction(quit_action)

        self.tray.setContextMenu(tray_menu)
        self.tray.activated.connect(self._on_tray_activated)
        self.tray.show()

    def _setup_hotkey(self) -> None:
        """Globalen Hotkey (Strg+Shift+A) registrieren."""
        try:
            import keyboard
            hotkey_combo = self.config.get("hotkey", "ctrl+shift+a")
            keyboard.add_hotkey(hotkey_combo, self._on_hotkey_pressed)
        except ImportError:
            print("Info: 'keyboard'-Modul nicht verfügbar. Globaler Hotkey deaktiviert.")
        except Exception as e:
            print(f"Info: Globaler Hotkey konnte nicht registriert werden: {e}")

    def _on_hotkey_pressed(self) -> None:
        """Callback wenn globaler Hotkey gedrückt wird."""
        QTimer.singleShot(0, self._toggle_mini_overlay)

    def _on_tray_activated(self, reason: QSystemTrayIcon.ActivationReason) -> None:
        """Tray-Icon-Klick behandeln."""
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self._show_main_window()
        elif reason == QSystemTrayIcon.ActivationReason.Trigger:
            self._show_main_window()

    def _show_main_window(self) -> None:
        """Haupt-Fenster anzeigen und aktivieren."""
        self.main_window.show()
        self.main_window.raise_()
        self.main_window.activateWindow()

    def _toggle_mini_overlay(self) -> None:
        """Mini-Overlay ein-/ausblenden."""
        self.mini_overlay.toggle()

    def _hide_mini_overlay(self) -> None:
        """Mini-Overlay verstecken."""
        self.mini_overlay.hide()

    def _on_mini_query(self, query: str) -> None:
        """Anfrage vom Mini-Overlay verarbeiten."""
        # An Haupt-Chat weiterleiten
        self.main_window.chat_widget.chat_input.setPlainText(query)
        self._show_main_window()
        self.main_window.chat_widget.send_message()
        self.mini_overlay.hide()

    def _new_chat(self) -> None:
        """Neuen Chat starten."""
        self.main_window._new_chat()
        self._show_main_window()

    def _quit(self) -> None:
        """Anwendung vollständig beenden."""
        # Clipboard-Monitor stoppen
        self.main_window.clipboard_monitor.stop_monitoring()
        # Hotkey entfernen
        try:
            import keyboard
            keyboard.unhook_all()
        except Exception:
            pass
        # Tray entfernen
        self.tray.hide()
        # Anwendung beenden
        self.app.quit()

    def run(self) -> int:
        """Anwendung starten."""
        # Fenster anzeigen (falls nicht minimiert starten)
        if not self.config.get("start_minimized", False):
            self._show_main_window()
        else:
            self.tray.showMessage(
                "Adex",
                "Adex läuft im Hintergrund. Klicke auf das Tray-Icon oder drücke Strg+Shift+A.",
                QSystemTrayIcon.MessageIcon.Information,
                3000,
            )

        return self.app.exec()


def _acquire_lock() -> bool:
    """
    Einfache Datei-Sperre für Einzelinstanz.
    Speichert die PID in der Lock-Datei und prüft ob der Prozess noch läuft.
    """
    lock_file = os.path.join(os.path.expanduser("~"), ".adex.lock")

    if os.path.exists(lock_file):
        try:
            with open(lock_file, "r") as f:
                old_pid = int(f.read().strip())
            # Prüfen ob der alte Prozess noch läuft
            try:
                os.kill(old_pid, 0)
                # Prozess läuft noch → Instanz aktiv
                return False
            except (OSError, ProcessLookupError):
                # Prozess existiert nicht mehr → stale Lock
                pass
        except (ValueError, IOError):
            pass

    # Lock-Datei mit aktueller PID erstellen
    try:
        with open(lock_file, "w") as f:
            f.write(str(os.getpid()))
    except IOError:
        pass
    return True


def _release_lock() -> None:
    """Lock-Datei entfernen."""
    lock_file = os.path.join(os.path.expanduser("~"), ".adex.lock")
    try:
        with open(lock_file, "r") as f:
            stored_pid = int(f.read().strip())
        if stored_pid == os.getpid():
            os.remove(lock_file)
    except (ValueError, IOError, OSError):
        pass


def main() -> None:
    """Hauptfunktion — Adex starten."""
    if not _acquire_lock():
        print("Adex läuft bereits. Nur eine Instanz erlaubt.")
        sys.exit(0)

    try:
        adex = AdexApp()
        sys.exit(adex.run())
    except Exception as e:
        print(f"Kritischer Fehler: {e}")
        sys.exit(1)
    finally:
        _release_lock()


if __name__ == "__main__":
    main()
