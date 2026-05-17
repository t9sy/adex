"""
Mini-Overlay-Fenster (Kompakt-Modus).
Schnellzugriff auf Adex, ähnlich wie Spotlight/Alfred.
"""

from typing import Optional

from PyQt6.QtWidgets import (
    QWidget, QHBoxLayout, QLineEdit, QPushButton, QLabel,
    QVBoxLayout, QFrame, QApplication,
)
from PyQt6.QtCore import Qt, pyqtSignal, QPropertyAnimation, QEasingCurve, QRect
from PyQt6.QtGui import QKeyEvent


class MiniOverlay(QWidget):
    """Kompaktes Overlay-Fenster für schnelle Eingaben."""

    query_submitted = pyqtSignal(str)
    close_requested = pyqtSignal()

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.setWindowTitle("Adex — Schnellzugriff")
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedWidth(600)
        self.setFixedHeight(70)

        self._setup_ui()
        self._center_on_screen()

    def _setup_ui(self) -> None:
        """UI-Elemente erstellen."""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)

        # Glassmorphism-Container
        container = QFrame()
        container.setStyleSheet(
            "QFrame {"
            "  background-color: rgba(10, 14, 23, 0.92);"
            "  border: 1px solid rgba(0, 212, 255, 0.3);"
            "  border-radius: 16px;"
            "}"
        )
        container_layout = QHBoxLayout(container)
        container_layout.setContentsMargins(16, 12, 16, 12)
        container_layout.setSpacing(12)

        # Adex-Logo/Label
        logo_label = QLabel("⚡")
        logo_label.setStyleSheet("font-size: 22px; background: transparent; border: none;")
        container_layout.addWidget(logo_label)

        # Eingabefeld
        self.input_field = QLineEdit()
        self.input_field.setPlaceholderText("Frag Adex etwas...")
        self.input_field.setStyleSheet(
            "QLineEdit {"
            "  background-color: transparent;"
            "  border: none;"
            "  color: #e0e6ed;"
            "  font-size: 16px;"
            "  padding: 4px;"
            "}"
        )
        self.input_field.returnPressed.connect(self._on_submit)
        container_layout.addWidget(self.input_field, stretch=1)

        # Senden-Button
        send_btn = QPushButton("➤")
        send_btn.setStyleSheet(
            "QPushButton {"
            "  background-color: #00D4FF;"
            "  color: #0a0e17;"
            "  border: none;"
            "  border-radius: 14px;"
            "  font-size: 14px;"
            "  font-weight: 700;"
            "  min-width: 32px;"
            "  min-height: 32px;"
            "}"
            "QPushButton:hover { background-color: #33ddff; }"
        )
        send_btn.clicked.connect(self._on_submit)
        container_layout.addWidget(send_btn)

        # ESC-Hinweis
        esc_label = QLabel("ESC")
        esc_label.setStyleSheet(
            "font-size: 10px; color: #5a6577; background: transparent; "
            "border: none; padding: 0 4px;"
        )
        container_layout.addWidget(esc_label)

        main_layout.addWidget(container)

        # Ergebnis-Bereich (anfangs versteckt)
        self.result_frame = QFrame()
        self.result_frame.setStyleSheet(
            "QFrame {"
            "  background-color: rgba(10, 14, 23, 0.92);"
            "  border: 1px solid rgba(0, 212, 255, 0.2);"
            "  border-radius: 12px;"
            "  margin-top: 4px;"
            "}"
        )
        result_layout = QVBoxLayout(self.result_frame)
        result_layout.setContentsMargins(16, 12, 16, 12)

        self.result_label = QLabel("")
        self.result_label.setWordWrap(True)
        self.result_label.setStyleSheet(
            "color: #e0e6ed; font-size: 14px; background: transparent; border: none;"
        )
        result_layout.addWidget(self.result_label)

        self.result_frame.setVisible(False)
        main_layout.addWidget(self.result_frame)

    def _center_on_screen(self) -> None:
        """Overlay zentriert auf dem Bildschirm positionieren."""
        screen = QApplication.primaryScreen()
        if screen:
            screen_geo = screen.availableGeometry()
            x = (screen_geo.width() - self.width()) // 2
            y = screen_geo.height() // 3
            self.move(x, y)

    def _on_submit(self) -> None:
        """Eingabe absenden."""
        text = self.input_field.text().strip()
        if text:
            self.query_submitted.emit(text)
            self.input_field.clear()

    def show_result(self, text: str) -> None:
        """Ergebnis im Overlay anzeigen."""
        self.result_label.setText(text)
        self.result_frame.setVisible(True)
        # Fensterhöhe anpassen
        self.setFixedHeight(70 + self.result_frame.sizeHint().height() + 8)

    def hide_result(self) -> None:
        """Ergebnisbereich verstecken."""
        self.result_frame.setVisible(False)
        self.setFixedHeight(70)

    def keyPressEvent(self, event: QKeyEvent) -> None:
        """ESC schließt das Overlay."""
        if event.key() == Qt.Key.Key_Escape:
            self.hide_result()
            self.close_requested.emit()
            self.hide()
        else:
            super().keyPressEvent(event)

    def showEvent(self, event) -> None:
        """Beim Anzeigen Fokus auf Eingabefeld setzen."""
        super().showEvent(event)
        self.input_field.setFocus()
        self.input_field.selectAll()

    def toggle(self) -> None:
        """Overlay ein-/ausblenden."""
        if self.isVisible():
            self.hide()
        else:
            self._center_on_screen()
            self.show()
            self.activateWindow()
            self.input_field.setFocus()
