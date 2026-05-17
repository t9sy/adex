"""
Chat-Widget mit Streaming-Antworten, Markdown-Rendering und Code-Highlighting.
Kernstück der Adex-Benutzeroberfläche.
"""

import uuid
from datetime import datetime
from typing import Optional

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton,
    QScrollArea, QLabel, QFrame, QSizePolicy, QApplication,
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt6.QtGui import QKeyEvent, QTextCursor, QFont

from core.nim_client import NIMClient
from core.database import Database
from core.commands import CommandParser


class StreamWorker(QThread):
    """Hintergrund-Thread für Streaming-Antworten der KI."""
    token_received = pyqtSignal(str)
    stream_finished = pyqtSignal(str)
    stream_error = pyqtSignal(str)

    def __init__(self, nim_client: NIMClient, message: str, system_prompt: Optional[str] = None):
        super().__init__()
        self.nim_client = nim_client
        self.message = message
        self.system_prompt = system_prompt
        self._full_response = ""

    def run(self) -> None:
        """Streaming-Antwort in Hintergrund-Thread ausführen."""
        try:
            for token in self.nim_client.stream_chat(self.message, self.system_prompt):
                self._full_response += token
                self.token_received.emit(token)
            self.stream_finished.emit(self._full_response)
        except Exception as e:
            self.stream_error.emit(str(e))


class VisionWorker(QThread):
    """Hintergrund-Thread für Screenshot-/Bild-Analyse über Vision-Modell."""
    token_received = pyqtSignal(str)
    stream_finished = pyqtSignal(str)
    stream_error = pyqtSignal(str)

    def __init__(self, nim_client: NIMClient, image_path: str, prompt: str):
        super().__init__()
        self.nim_client = nim_client
        self.image_path = image_path
        self.prompt = prompt
        self._full_response = ""

    def run(self) -> None:
        try:
            for token in self.nim_client.stream_vision(self.image_path, self.prompt):
                self._full_response += token
                self.token_received.emit(token)
            self.stream_finished.emit(self._full_response)
        except Exception as e:
            self.stream_error.emit(str(e))


class TranslateWorker(QThread):
    """Hintergrund-Thread für Übersetzung über NIM API."""
    token_received = pyqtSignal(str)
    stream_finished = pyqtSignal(str)
    stream_error = pyqtSignal(str)

    def __init__(self, nim_client: NIMClient, text: str, target_lang: str):
        super().__init__()
        self.nim_client = nim_client
        self.text = text
        self.target_lang = target_lang
        self._full_response = ""

    def run(self) -> None:
        try:
            for token in self.nim_client.translate(self.text, self.target_lang):
                self._full_response += token
                self.token_received.emit(token)
            self.stream_finished.emit(self._full_response)
        except Exception as e:
            self.stream_error.emit(str(e))


class MessageBubble(QFrame):
    """Einzelne Chat-Nachricht als Blase dargestellt."""

    def __init__(self, content: str, is_user: bool, timestamp: str = "", parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.is_user = is_user
        self.setObjectName("userMessage" if is_user else "assistantMessage")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        # Absender-Label
        sender = QLabel("Du" if is_user else "Adex")
        sender.setObjectName("accentLabel" if not is_user else "subtitle")
        sender.setStyleSheet(
            f"font-weight: 700; font-size: 12px; color: {'#00D4FF' if not is_user else '#8892a4'};"
        )
        layout.addWidget(sender)

        # Nachrichtentext
        self.content_label = QLabel()
        self.content_label.setWordWrap(True)
        self.content_label.setTextFormat(Qt.TextFormat.RichText)
        self.content_label.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
            | Qt.TextInteractionFlag.LinksAccessibleByMouse
        )
        self.content_label.setOpenExternalLinks(True)
        self.set_content(content)
        layout.addWidget(self.content_label)

        # Zeitstempel
        if timestamp:
            time_label = QLabel(timestamp)
            time_label.setStyleSheet("font-size: 11px; color: #5a6577;")
            time_label.setAlignment(Qt.AlignmentFlag.AlignRight)
            layout.addWidget(time_label)

        self.setSizePolicy(QSizePolicy.Policy.Preferred, QSizePolicy.Policy.Minimum)

    def set_content(self, content: str) -> None:
        """Nachrichteninhalt setzen mit einfachem Markdown-Rendering."""
        html = self._markdown_to_html(content)
        self.content_label.setText(html)

    def append_content(self, token: str) -> None:
        """Token an bestehenden Inhalt anhängen (für Streaming)."""
        current = self.content_label.text()
        # Wir bauen den Rohtext auf und rendern dann neu
        if not hasattr(self, "_raw_content"):
            self._raw_content = ""
        self._raw_content += token
        html = self._markdown_to_html(self._raw_content)
        self.content_label.setText(html)

    def _markdown_to_html(self, text: str) -> str:
        """Einfaches Markdown zu HTML konvertieren."""
        import re

        if not text:
            return ""

        html = text

        # Code-Blöcke (```...```)
        def replace_code_block(match: re.Match) -> str:
            lang = match.group(1) or ""
            code = match.group(2).strip()
            code = code.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            lang_label = f'<span style="color: #00D4FF; font-size: 11px;">{lang}</span><br>' if lang else ""
            return (
                f'<div style="background-color: rgba(0,0,0,0.3); border-radius: 8px; '
                f'padding: 12px; margin: 8px 0; font-family: Consolas, monospace; '
                f'font-size: 13px;">{lang_label}<pre style="margin: 0; white-space: pre-wrap;">{code}</pre></div>'
            )

        html = re.sub(r"```(\w*)\n(.*?)```", replace_code_block, html, flags=re.DOTALL)

        # Inline-Code (`...`)
        html = re.sub(
            r"`([^`]+)`",
            r'<code style="background-color: rgba(0,212,255,0.1); padding: 2px 6px; '
            r'border-radius: 4px; font-family: Consolas, monospace; font-size: 13px;">\1</code>',
            html,
        )

        # Fett (**...**)
        html = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", html)

        # Kursiv (*...*)
        html = re.sub(r"\*(.+?)\*", r"<i>\1</i>", html)

        # Überschriften (### ... , ## ... , # ...)
        html = re.sub(
            r"^### (.+)$",
            r'<h4 style="color: #00D4FF; margin: 8px 0 4px 0;">\1</h4>',
            html,
            flags=re.MULTILINE,
        )
        html = re.sub(
            r"^## (.+)$",
            r'<h3 style="color: #00D4FF; margin: 10px 0 4px 0;">\1</h3>',
            html,
            flags=re.MULTILINE,
        )
        html = re.sub(
            r"^# (.+)$",
            r'<h2 style="color: #00D4FF; margin: 12px 0 6px 0;">\1</h2>',
            html,
            flags=re.MULTILINE,
        )

        # Links [text](url)
        html = re.sub(
            r"\[(.+?)\]\((.+?)\)",
            r'<a href="\2" style="color: #00D4FF;">\1</a>',
            html,
        )

        # Aufzählungen
        html = re.sub(r"^[-*] (.+)$", r"• \1", html, flags=re.MULTILINE)

        # Zeilenumbrüche
        html = html.replace("\n", "<br>")

        return html


class ChatInput(QTextEdit):
    """Chat-Eingabefeld mit Enter/Shift+Enter-Unterstützung."""
    send_message = pyqtSignal()

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.setObjectName("chatInput")
        self.setPlaceholderText("Nachricht eingeben... (Enter = Senden, Shift+Enter = Zeilenumbruch)")
        self.setMaximumHeight(120)
        self.setMinimumHeight(44)
        self.setAcceptRichText(False)
        self.setTabChangesFocus(True)

    def keyPressEvent(self, event: QKeyEvent) -> None:
        """Enter zum Senden, Shift+Enter für Zeilenumbruch."""
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            if event.modifiers() & Qt.KeyboardModifier.ShiftModifier:
                super().keyPressEvent(event)
            else:
                self.send_message.emit()
        else:
            super().keyPressEvent(event)


class ChatWidget(QWidget):
    """Vollständiges Chat-Interface mit Streaming-Support."""

    def __init__(
        self,
        nim_client: Optional[NIMClient] = None,
        database: Optional[Database] = None,
        command_parser: Optional[CommandParser] = None,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self.nim_client = nim_client
        self.database = database
        self.command_parser = command_parser
        self.session_id = str(uuid.uuid4())[:8]
        self._stream_worker: Optional[StreamWorker] = None
        self._current_bubble: Optional[MessageBubble] = None
        self._is_streaming = False

        self._setup_ui()

    def _setup_ui(self) -> None:
        """UI-Elemente erstellen und anordnen."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Chat-Nachrichtenbereich (scrollbar)
        self.scroll_area = QScrollArea()
        self.scroll_area.setObjectName("chatArea")
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.chat_container = QWidget()
        self.chat_container.setObjectName("chatContainer")
        self.chat_layout = QVBoxLayout(self.chat_container)
        self.chat_layout.setContentsMargins(16, 16, 16, 16)
        self.chat_layout.setSpacing(12)
        self.chat_layout.addStretch()

        self.scroll_area.setWidget(self.chat_container)
        layout.addWidget(self.scroll_area, stretch=1)

        # Typing-Indicator
        self.typing_label = QLabel("")
        self.typing_label.setObjectName("typingIndicator")
        self.typing_label.setVisible(False)
        layout.addWidget(self.typing_label)

        # Eingabebereich
        input_frame = QFrame()
        input_frame.setStyleSheet(
            "background-color: rgba(12, 17, 28, 0.95); "
            "border-top: 1px solid rgba(0, 212, 255, 0.1); padding: 8px;"
        )
        input_layout = QHBoxLayout(input_frame)
        input_layout.setContentsMargins(16, 8, 16, 8)
        input_layout.setSpacing(8)

        self.chat_input = ChatInput()
        self.chat_input.send_message.connect(self.send_message)
        input_layout.addWidget(self.chat_input, stretch=1)

        # Screenshot-Button
        self.screenshot_btn = QPushButton("📷")
        self.screenshot_btn.setObjectName("sendBtn")
        self.screenshot_btn.setToolTip("Screenshot aufnehmen und analysieren")
        self.screenshot_btn.clicked.connect(self._take_screenshot)
        self.screenshot_btn.setFixedSize(44, 44)
        input_layout.addWidget(self.screenshot_btn)

        self.send_btn = QPushButton("➤")
        self.send_btn.setObjectName("sendBtn")
        self.send_btn.setToolTip("Nachricht senden (Enter)")
        self.send_btn.clicked.connect(self.send_message)
        self.send_btn.setFixedSize(44, 44)
        input_layout.addWidget(self.send_btn)

        layout.addWidget(input_frame)

        # Willkommensnachricht anzeigen
        self._add_welcome_message()

    def _add_welcome_message(self) -> None:
        """Begrüßungsnachricht beim Start anzeigen."""
        welcome = (
            "Hallo! Ich bin **Adex**, dein KI-Assistent. Ich kann dir bei vielen "
            "Dingen helfen:\n\n"
            "- Fragen beantworten und recherchieren\n"
            "- Im Web suchen und Webseiten zusammenfassen\n"
            "- Deinen PC überwachen (CPU, RAM, Prozesse)\n"
            "- Notizen und Aufgaben verwalten\n"
            "- Code erklären und debuggen\n"
            "- Texte übersetzen\n\n"
            "Wie kann ich dir helfen?"
        )
        self._add_message_bubble(welcome, is_user=False)

    def send_message(self) -> None:
        """Benutzernachricht senden und KI-Antwort streamen."""
        text = self.chat_input.toPlainText().strip()
        if not text or self._is_streaming:
            return

        # Benutzernachricht anzeigen
        timestamp = datetime.now().strftime("%H:%M")
        self._add_message_bubble(text, is_user=True, timestamp=timestamp)

        # In DB speichern
        if self.database:
            self.database.save_chat_message(self.session_id, "user", text)

        # Eingabe leeren
        self.chat_input.clear()

        # Lokale Kommandos prüfen (Rechner, Übersetzung, Datei-Ops)
        if self.command_parser:
            handled, response = self.command_parser.try_parse(text)
            if handled:
                # Übersetzung über NIM API streamen
                if response.startswith("__TRANSLATE__:") and self.nim_client:
                    parts = response.split(":", 2)
                    target_lang = parts[1] if len(parts) > 1 else "Englisch"
                    translate_text = parts[2] if len(parts) > 2 else text
                    self._start_translate_stream(translate_text, target_lang)
                    return
                self._add_message_bubble(response, is_user=False, timestamp=timestamp)
                if self.database:
                    self.database.save_chat_message(self.session_id, "assistant", response)
                return

        # KI-Antwort starten
        if self.nim_client:
            self._start_streaming(text)
        else:
            self._add_message_bubble(
                "⚠️ Kein API-Key konfiguriert. Bitte gehe zu den Einstellungen und gib deinen NVIDIA NIM API-Key ein.",
                is_user=False,
                timestamp=timestamp,
            )

    def _start_streaming(self, message: str) -> None:
        """Streaming-Antwort von der KI starten."""
        self._is_streaming = True
        self.send_btn.setEnabled(False)
        self.typing_label.setText("Adex denkt nach...")
        self.typing_label.setVisible(True)

        # Leere Antwort-Blase erstellen
        timestamp = datetime.now().strftime("%H:%M")
        self._current_bubble = MessageBubble("", is_user=False, timestamp=timestamp)
        self._current_bubble._raw_content = ""
        # Vor dem Stretch einfügen
        idx = self.chat_layout.count() - 1
        self.chat_layout.insertWidget(idx, self._current_bubble)

        # Worker starten
        self._stream_worker = StreamWorker(self.nim_client, message)
        self._stream_worker.token_received.connect(self._on_token)
        self._stream_worker.stream_finished.connect(self._on_stream_finished)
        self._stream_worker.stream_error.connect(self._on_stream_error)
        self._stream_worker.start()

    def _on_token(self, token: str) -> None:
        """Neues Token von der KI empfangen."""
        if self._current_bubble:
            self._current_bubble.append_content(token)
            self._scroll_to_bottom()

    def _on_stream_finished(self, full_response: str) -> None:
        """Streaming abgeschlossen."""
        self._is_streaming = False
        self.send_btn.setEnabled(True)
        self.screenshot_btn.setEnabled(True)
        self.typing_label.setVisible(False)
        self._current_bubble = None

        # In DB speichern
        if self.database and full_response:
            self.database.save_chat_message(self.session_id, "assistant", full_response)

        self._scroll_to_bottom()

    def _on_stream_error(self, error: str) -> None:
        """Fehler beim Streaming."""
        self._is_streaming = False
        self.send_btn.setEnabled(True)
        self.screenshot_btn.setEnabled(True)
        self.typing_label.setVisible(False)

        if self._current_bubble:
            self._current_bubble.append_content(f"\n\n⚠️ Fehler: {error}")
        self._current_bubble = None

    def _add_message_bubble(
        self,
        content: str,
        is_user: bool,
        timestamp: str = "",
    ) -> MessageBubble:
        """Neue Nachrichtenblase zum Chat hinzufügen."""
        bubble = MessageBubble(content, is_user, timestamp)
        # Vor dem Stretch einfügen
        idx = self.chat_layout.count() - 1
        self.chat_layout.insertWidget(idx, bubble)
        QTimer.singleShot(50, self._scroll_to_bottom)
        return bubble

    def _scroll_to_bottom(self) -> None:
        """Chat nach unten scrollen."""
        scrollbar = self.scroll_area.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def clear_chat(self) -> None:
        """Chat-Verlauf löschen."""
        # Alle Nachrichten-Bubbles entfernen
        while self.chat_layout.count() > 1:  # Stretch-Item behalten
            item = self.chat_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()
        self._add_welcome_message()

    def new_session(self) -> None:
        """Neue Chat-Sitzung starten."""
        self.clear_chat()
        self.session_id = str(uuid.uuid4())[:8]
        if self.nim_client:
            self.nim_client.clear_history()

    def set_nim_client(self, client: NIMClient) -> None:
        """NIM-Client setzen oder aktualisieren."""
        self.nim_client = client

    def inject_context(self, context: str, label: str = "Kontext") -> None:
        """
        Kontext in den Chat einfügen (z.B. von Web-Suche, Clipboard etc.).
        Wird als System-Nachricht angezeigt.
        """
        info_text = f"📋 *{label}:*\n{context[:500]}{'...' if len(context) > 500 else ''}"
        self._add_message_bubble(info_text, is_user=False)

    def _take_screenshot(self) -> None:
        """Screenshot aufnehmen und zur Analyse senden."""
        if self._is_streaming:
            return

        if not self.nim_client:
            self._add_message_bubble(
                "⚠️ Kein API-Key konfiguriert. Screenshot-Analyse benötigt die NVIDIA NIM API.",
                is_user=False,
            )
            return

        try:
            from PIL import ImageGrab
        except ImportError:
            try:
                import subprocess
                import os
                import tempfile
                screenshot_dir = os.path.join(os.path.expanduser("~"), ".adex")
                os.makedirs(screenshot_dir, exist_ok=True)
                screenshot_path = os.path.join(screenshot_dir, "screenshot.png")
                result = subprocess.run(
                    ["import", "-window", "root", screenshot_path],
                    capture_output=True, timeout=10,
                )
                if result.returncode != 0:
                    self._add_message_bubble(
                        "⚠️ Screenshot konnte nicht aufgenommen werden.",
                        is_user=False,
                    )
                    return
                self._analyze_screenshot(screenshot_path)
                return
            except Exception:
                self._add_message_bubble(
                    "⚠️ Screenshot-Tool nicht verfügbar. Installiere `Pillow` oder `imagemagick`.",
                    is_user=False,
                )
                return

        import os
        screenshot_dir = os.path.join(os.path.expanduser("~"), ".adex")
        os.makedirs(screenshot_dir, exist_ok=True)
        screenshot_path = os.path.join(screenshot_dir, "screenshot.png")

        screenshot = ImageGrab.grab()
        screenshot.save(screenshot_path, "PNG")
        self._analyze_screenshot(screenshot_path)

    def _analyze_screenshot(self, image_path: str) -> None:
        """Screenshot an Vision-Modell senden und Analyse streamen."""
        timestamp = datetime.now().strftime("%H:%M")
        self._add_message_bubble("📷 *Screenshot aufgenommen — Analyse läuft...*", is_user=False)

        prompt = self.chat_input.toPlainText().strip()
        if not prompt:
            prompt = "Beschreibe dieses Bild detailliert auf Deutsch. Was siehst du?"
        else:
            self.chat_input.clear()
            self._add_message_bubble(prompt, is_user=True, timestamp=timestamp)

        self._is_streaming = True
        self.send_btn.setEnabled(False)
        self.screenshot_btn.setEnabled(False)
        self.typing_label.setText("Adex analysiert Screenshot...")
        self.typing_label.setVisible(True)

        self._current_bubble = MessageBubble("", is_user=False, timestamp=timestamp)
        self._current_bubble._raw_content = ""
        idx = self.chat_layout.count() - 1
        self.chat_layout.insertWidget(idx, self._current_bubble)

        self._stream_worker = VisionWorker(self.nim_client, image_path, prompt)
        self._stream_worker.token_received.connect(self._on_token)
        self._stream_worker.stream_finished.connect(self._on_stream_finished)
        self._stream_worker.stream_error.connect(self._on_stream_error)
        self._stream_worker.start()

    def _start_translate_stream(self, text: str, target_lang: str) -> None:
        """Übersetzung über NIM API streamen."""
        self._is_streaming = True
        self.send_btn.setEnabled(False)
        self.screenshot_btn.setEnabled(False)
        self.typing_label.setText("Adex übersetzt...")
        self.typing_label.setVisible(True)

        timestamp = datetime.now().strftime("%H:%M")
        self._current_bubble = MessageBubble("", is_user=False, timestamp=timestamp)
        self._current_bubble._raw_content = ""
        idx = self.chat_layout.count() - 1
        self.chat_layout.insertWidget(idx, self._current_bubble)

        self._stream_worker = TranslateWorker(self.nim_client, text, target_lang)
        self._stream_worker.token_received.connect(self._on_token)
        self._stream_worker.stream_finished.connect(self._on_stream_finished)
        self._stream_worker.stream_error.connect(self._on_stream_error)
        self._stream_worker.start()
