"""
Haupt-Fenster der Adex-Anwendung.
Enthält Sidebar, Header, Chat und weitere Ansichten.
"""

import os
from typing import Optional

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QLabel, QStackedWidget, QFrame, QLineEdit, QScrollArea,
    QTextEdit, QSpinBox, QDoubleSpinBox, QComboBox, QCheckBox,
    QProgressBar, QTableWidget, QTableWidgetItem, QHeaderView,
    QInputDialog, QMessageBox, QSplitter, QSizePolicy, QApplication,
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QIcon, QFont, QAction

from core.nim_client import NIMClient
from core.web_search import WebSearch
from core.news_reader import NewsReader
from core.system_info import SystemMonitor
from core.file_ops import FileAssistant
from core.clipboard import ClipboardMonitor
from core.database import Database
from core.config import ConfigManager
from ui.chat_widget import ChatWidget


class SidebarButton(QPushButton):
    """Button für die Sidebar-Navigation."""

    def __init__(self, text: str, icon_text: str = "", parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.setObjectName("sidebarBtn")
        display = f"{icon_text}  {text}" if icon_text else text
        self.setText(display)
        self.setCheckable(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(44)


class MainWindow(QMainWindow):
    """Adex Haupt-Fenster mit Sidebar-Navigation."""

    toggle_requested = pyqtSignal()

    def __init__(
        self,
        config: ConfigManager,
        database: Database,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self.config = config
        self.database = database
        self.nim_client: Optional[NIMClient] = None
        self.web_search = WebSearch()
        self.news_reader = NewsReader()
        self.system_monitor = SystemMonitor()
        self.file_assistant = FileAssistant()
        self.clipboard_monitor = ClipboardMonitor()

        # NIM-Client initialisieren falls API-Key vorhanden
        api_key = config.get_api_key()
        if api_key:
            self.nim_client = NIMClient(api_key)
            self.nim_client.set_system_prompt(config.get_system_prompt())
            self.nim_client.set_temperature(config.get_temperature())
            self.nim_client.set_max_tokens(config.get_max_tokens())

        self._setup_window()
        self._setup_ui()
        self._setup_timers()

        # Theme laden
        self._load_stylesheet()

    def _setup_window(self) -> None:
        """Fenster-Eigenschaften setzen."""
        self.setWindowTitle("Adex — KI-Desktop-Assistent")
        width = self.config.get("window_width", 1200)
        height = self.config.get("window_height", 800)
        self.resize(width, height)
        self.setMinimumSize(800, 500)

        if self.config.is_always_on_top():
            self.setWindowFlags(self.windowFlags() | Qt.WindowType.WindowStaysOnTopHint)

    def _load_stylesheet(self) -> None:
        """Qt-StyleSheet laden."""
        style_path = os.path.join(os.path.dirname(__file__), "styles.qss")
        if os.path.exists(style_path):
            with open(style_path, "r", encoding="utf-8") as f:
                self.setStyleSheet(f.read())

    def _setup_ui(self) -> None:
        """Haupt-UI aufbauen: Sidebar + Content."""
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QHBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # --- Sidebar ---
        sidebar = QWidget()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(220)
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(12, 16, 12, 16)
        sidebar_layout.setSpacing(4)

        # App-Titel
        title_label = QLabel("⚡ Adex")
        title_label.setObjectName("title")
        title_label.setStyleSheet("font-size: 24px; font-weight: 800; color: #00D4FF; padding: 8px 4px 16px 4px;")
        sidebar_layout.addWidget(title_label)

        # Navigations-Buttons
        self.nav_buttons: list[SidebarButton] = []
        nav_items = [
            ("Chat", "💬"),
            ("Web-Suche", "🔍"),
            ("News", "📰"),
            ("System", "💻"),
            ("Notizen", "📝"),
            ("Aufgaben", "✅"),
            ("Einstellungen", "⚙️"),
        ]

        for text, icon in nav_items:
            btn = SidebarButton(text, icon)
            btn.clicked.connect(lambda checked, t=text: self._switch_view(t))
            sidebar_layout.addWidget(btn)
            self.nav_buttons.append(btn)

        sidebar_layout.addStretch()

        # Neuer Chat Button
        new_chat_btn = QPushButton("+ Neuer Chat")
        new_chat_btn.setObjectName("primaryBtn")
        new_chat_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        new_chat_btn.clicked.connect(self._new_chat)
        sidebar_layout.addWidget(new_chat_btn)

        main_layout.addWidget(sidebar)

        # --- Content-Bereich ---
        content_area = QWidget()
        content_layout = QVBoxLayout(content_area)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)

        # Header
        header = QWidget()
        header.setObjectName("header")
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(16, 8, 16, 8)

        self.header_title = QLabel("💬 Chat")
        self.header_title.setStyleSheet("font-size: 18px; font-weight: 700; color: #ffffff;")
        header_layout.addWidget(self.header_title)

        header_layout.addStretch()

        # Suchleiste
        self.search_bar = QLineEdit()
        self.search_bar.setObjectName("searchBar")
        self.search_bar.setPlaceholderText("Suchen...")
        self.search_bar.setFixedWidth(250)
        self.search_bar.returnPressed.connect(self._on_search)
        header_layout.addWidget(self.search_bar)

        content_layout.addWidget(header)

        # Stacked Widget für verschiedene Ansichten
        self.stack = QStackedWidget()
        content_layout.addWidget(self.stack, stretch=1)

        # Ansichten erstellen
        self._create_chat_view()
        self._create_web_search_view()
        self._create_news_view()
        self._create_system_view()
        self._create_notes_view()
        self._create_tasks_view()
        self._create_settings_view()

        main_layout.addWidget(content_area, stretch=1)

        # Erste Ansicht aktivieren
        self.nav_buttons[0].setChecked(True)
        self._switch_view("Chat")

    def _create_chat_view(self) -> None:
        """Chat-Ansicht erstellen."""
        self.chat_widget = ChatWidget(self.nim_client, self.database)
        self.stack.addWidget(self.chat_widget)

    def _create_web_search_view(self) -> None:
        """Web-Suche-Ansicht erstellen."""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Suchfeld
        search_frame = QFrame()
        search_layout = QHBoxLayout(search_frame)

        self.web_input = QLineEdit()
        self.web_input.setObjectName("searchBar")
        self.web_input.setPlaceholderText("Web-Suche oder URL eingeben...")
        self.web_input.returnPressed.connect(self._do_web_search)
        search_layout.addWidget(self.web_input, stretch=1)

        search_btn = QPushButton("Suchen")
        search_btn.setObjectName("primaryBtn")
        search_btn.clicked.connect(self._do_web_search)
        search_layout.addWidget(search_btn)

        wiki_btn = QPushButton("Wikipedia")
        wiki_btn.setObjectName("secondaryBtn")
        wiki_btn.clicked.connect(self._do_wikipedia_search)
        search_layout.addWidget(wiki_btn)

        layout.addWidget(search_frame)

        # Ergebnis-Bereich
        self.web_results = QTextEdit()
        self.web_results.setReadOnly(True)
        self.web_results.setStyleSheet(
            "background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); "
            "border-radius: 12px; padding: 16px; font-size: 14px; color: #e0e6ed;"
        )
        self.web_results.setPlaceholderText("Suchergebnisse werden hier angezeigt...")
        layout.addWidget(self.web_results, stretch=1)

        # An KI senden
        send_to_ai_btn = QPushButton("Ergebnis an KI-Chat senden ➤")
        send_to_ai_btn.setObjectName("secondaryBtn")
        send_to_ai_btn.clicked.connect(self._send_web_result_to_chat)
        layout.addWidget(send_to_ai_btn)

        self.stack.addWidget(page)

    def _create_news_view(self) -> None:
        """News-Ansicht erstellen."""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Feed-Auswahl
        feed_frame = QFrame()
        feed_layout = QHBoxLayout(feed_frame)

        feed_label = QLabel("Feed:")
        feed_label.setStyleSheet("font-weight: 600; color: #e0e6ed;")
        feed_layout.addWidget(feed_label)

        self.feed_combo = QComboBox()
        for name in self.news_reader.list_feeds():
            self.feed_combo.addItem(name)
        feed_layout.addWidget(self.feed_combo, stretch=1)

        fetch_btn = QPushButton("Laden")
        fetch_btn.setObjectName("primaryBtn")
        fetch_btn.clicked.connect(self._fetch_news)
        feed_layout.addWidget(fetch_btn)

        summarize_btn = QPushButton("KI-Zusammenfassung")
        summarize_btn.setObjectName("secondaryBtn")
        summarize_btn.clicked.connect(self._summarize_news)
        feed_layout.addWidget(summarize_btn)

        layout.addWidget(feed_frame)

        # News-Anzeige
        self.news_display = QTextEdit()
        self.news_display.setReadOnly(True)
        self.news_display.setStyleSheet(
            "background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); "
            "border-radius: 12px; padding: 16px; font-size: 14px; color: #e0e6ed;"
        )
        self.news_display.setPlaceholderText("Wähle einen Feed und klicke 'Laden'...")
        layout.addWidget(self.news_display, stretch=1)

        self.stack.addWidget(page)

    def _create_system_view(self) -> None:
        """System-Monitor-Ansicht erstellen."""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Übersicht-Karten
        cards_layout = QHBoxLayout()

        # CPU-Karte
        cpu_card = QFrame()
        cpu_card.setObjectName("glassCard")
        cpu_layout = QVBoxLayout(cpu_card)
        cpu_layout.addWidget(QLabel("🖥️ CPU"))
        self.cpu_label = QLabel("0%")
        self.cpu_label.setStyleSheet("font-size: 28px; font-weight: 700; color: #00D4FF;")
        cpu_layout.addWidget(self.cpu_label)
        self.cpu_bar = QProgressBar()
        self.cpu_bar.setMaximum(100)
        cpu_layout.addWidget(self.cpu_bar)
        cards_layout.addWidget(cpu_card)

        # RAM-Karte
        ram_card = QFrame()
        ram_card.setObjectName("glassCard")
        ram_layout = QVBoxLayout(ram_card)
        ram_layout.addWidget(QLabel("🧠 RAM"))
        self.ram_label = QLabel("0%")
        self.ram_label.setStyleSheet("font-size: 28px; font-weight: 700; color: #00D4FF;")
        ram_layout.addWidget(self.ram_label)
        self.ram_bar = QProgressBar()
        self.ram_bar.setMaximum(100)
        ram_layout.addWidget(self.ram_bar)
        cards_layout.addWidget(ram_card)

        # Disk-Karte
        disk_card = QFrame()
        disk_card.setObjectName("glassCard")
        disk_layout = QVBoxLayout(disk_card)
        disk_layout.addWidget(QLabel("💾 Festplatte"))
        self.disk_label = QLabel("0%")
        self.disk_label.setStyleSheet("font-size: 28px; font-weight: 700; color: #00D4FF;")
        disk_layout.addWidget(self.disk_label)
        self.disk_bar = QProgressBar()
        self.disk_bar.setMaximum(100)
        disk_layout.addWidget(self.disk_bar)
        cards_layout.addWidget(disk_card)

        layout.addLayout(cards_layout)

        # Prozess-Tabelle
        proc_header = QHBoxLayout()
        proc_label = QLabel("Laufende Prozesse")
        proc_label.setStyleSheet("font-size: 16px; font-weight: 600; color: #ffffff;")
        proc_header.addWidget(proc_label)
        proc_header.addStretch()

        refresh_btn = QPushButton("Aktualisieren")
        refresh_btn.setObjectName("secondaryBtn")
        refresh_btn.clicked.connect(self._refresh_processes)
        proc_header.addWidget(refresh_btn)

        kill_btn = QPushButton("Prozess beenden")
        kill_btn.setObjectName("secondaryBtn")
        kill_btn.setStyleSheet(
            "QPushButton { background-color: rgba(255,60,60,0.15); color: #ff6060; "
            "border: 1px solid rgba(255,60,60,0.3); border-radius: 8px; padding: 8px 16px; }"
            "QPushButton:hover { background-color: rgba(255,60,60,0.25); }"
        )
        kill_btn.clicked.connect(self._kill_selected_process)
        proc_header.addWidget(kill_btn)

        layout.addLayout(proc_header)

        self.process_table = QTableWidget()
        self.process_table.setColumnCount(5)
        self.process_table.setHorizontalHeaderLabels(["PID", "Name", "CPU %", "RAM %", "Status"])
        self.process_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.process_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.process_table.setAlternatingRowColors(True)
        layout.addWidget(self.process_table, stretch=1)

        self.stack.addWidget(page)

    def _create_notes_view(self) -> None:
        """Notizen-Ansicht erstellen."""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Header
        notes_header = QHBoxLayout()
        notes_title = QLabel("📝 Notizen")
        notes_title.setStyleSheet("font-size: 18px; font-weight: 700; color: #ffffff;")
        notes_header.addWidget(notes_title)
        notes_header.addStretch()

        add_note_btn = QPushButton("+ Neue Notiz")
        add_note_btn.setObjectName("primaryBtn")
        add_note_btn.clicked.connect(self._add_note)
        notes_header.addWidget(add_note_btn)

        layout.addLayout(notes_header)

        # Splitter: Liste | Editor
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Notiz-Liste
        self.notes_list = QTableWidget()
        self.notes_list.setColumnCount(2)
        self.notes_list.setHorizontalHeaderLabels(["Titel", "Aktualisiert"])
        self.notes_list.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.notes_list.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.notes_list.cellClicked.connect(self._load_note)
        splitter.addWidget(self.notes_list)

        # Notiz-Editor
        editor_widget = QWidget()
        editor_layout = QVBoxLayout(editor_widget)
        editor_layout.setContentsMargins(0, 0, 0, 0)

        self.note_title_input = QLineEdit()
        self.note_title_input.setPlaceholderText("Notiz-Titel...")
        self.note_title_input.setStyleSheet(
            "font-size: 18px; font-weight: 600; background: transparent; "
            "border: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px;"
        )
        editor_layout.addWidget(self.note_title_input)

        self.note_editor = QTextEdit()
        self.note_editor.setPlaceholderText("Notiz-Inhalt hier eingeben...")
        self.note_editor.setStyleSheet(
            "background-color: rgba(255,255,255,0.03); border: none; "
            "padding: 12px; font-size: 14px; color: #e0e6ed;"
        )
        editor_layout.addWidget(self.note_editor, stretch=1)

        # Notiz-Aktionen
        note_actions = QHBoxLayout()
        save_note_btn = QPushButton("Speichern")
        save_note_btn.setObjectName("primaryBtn")
        save_note_btn.clicked.connect(self._save_note)
        note_actions.addWidget(save_note_btn)

        summarize_note_btn = QPushButton("KI-Zusammenfassung")
        summarize_note_btn.setObjectName("secondaryBtn")
        summarize_note_btn.clicked.connect(self._summarize_note)
        note_actions.addWidget(summarize_note_btn)

        delete_note_btn = QPushButton("Löschen")
        delete_note_btn.setObjectName("secondaryBtn")
        delete_note_btn.clicked.connect(self._delete_note)
        note_actions.addWidget(delete_note_btn)

        note_actions.addStretch()
        editor_layout.addLayout(note_actions)

        splitter.addWidget(editor_widget)
        splitter.setSizes([300, 500])

        layout.addWidget(splitter, stretch=1)

        self._current_note_id: Optional[int] = None
        self.stack.addWidget(page)

    def _create_tasks_view(self) -> None:
        """Aufgaben-Ansicht erstellen."""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)

        # Header
        tasks_header = QHBoxLayout()
        tasks_title = QLabel("✅ Aufgaben")
        tasks_title.setStyleSheet("font-size: 18px; font-weight: 700; color: #ffffff;")
        tasks_header.addWidget(tasks_title)
        tasks_header.addStretch()

        add_task_btn = QPushButton("+ Neue Aufgabe")
        add_task_btn.setObjectName("primaryBtn")
        add_task_btn.clicked.connect(self._add_task)
        tasks_header.addWidget(add_task_btn)

        ai_prioritize_btn = QPushButton("KI-Priorisierung")
        ai_prioritize_btn.setObjectName("secondaryBtn")
        ai_prioritize_btn.clicked.connect(self._ai_prioritize_tasks)
        tasks_header.addWidget(ai_prioritize_btn)

        layout.addLayout(tasks_header)

        # Aufgaben-Tabelle
        self.tasks_table = QTableWidget()
        self.tasks_table.setColumnCount(5)
        self.tasks_table.setHorizontalHeaderLabels(["Status", "Aufgabe", "Priorität", "Fällig", "Aktionen"])
        self.tasks_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.tasks_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        layout.addWidget(self.tasks_table, stretch=1)

        self.stack.addWidget(page)

    def _create_settings_view(self) -> None:
        """Einstellungen-Ansicht erstellen."""
        page = QScrollArea()
        page.setWidgetResizable(True)
        page.setStyleSheet("QScrollArea { border: none; }")

        settings_widget = QWidget()
        layout = QVBoxLayout(settings_widget)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        title = QLabel("⚙️ Einstellungen")
        title.setStyleSheet("font-size: 22px; font-weight: 700; color: #ffffff;")
        layout.addWidget(title)

        # API-Key
        api_card = QFrame()
        api_card.setObjectName("glassCard")
        api_layout = QVBoxLayout(api_card)
        api_layout.addWidget(QLabel("🔑 NVIDIA NIM API-Key"))
        api_hint = QLabel("Hole deinen kostenlosen Key auf build.nvidia.com")
        api_hint.setStyleSheet("color: #5a6577; font-size: 12px;")
        api_layout.addWidget(api_hint)

        api_input_layout = QHBoxLayout()
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("nvapi-...")
        if self.config.has_api_key():
            self.api_key_input.setText(self.config.get_api_key())
        api_input_layout.addWidget(self.api_key_input, stretch=1)

        save_key_btn = QPushButton("Speichern")
        save_key_btn.setObjectName("primaryBtn")
        save_key_btn.clicked.connect(self._save_api_key)
        api_input_layout.addWidget(save_key_btn)

        api_layout.addLayout(api_input_layout)
        layout.addWidget(api_card)

        # System-Prompt
        prompt_card = QFrame()
        prompt_card.setObjectName("glassCard")
        prompt_layout = QVBoxLayout(prompt_card)
        prompt_layout.addWidget(QLabel("🧠 System-Prompt (Persönlichkeit)"))
        self.prompt_input = QTextEdit()
        self.prompt_input.setPlaceholderText("System-Prompt eingeben...")
        self.prompt_input.setText(self.config.get_system_prompt())
        self.prompt_input.setMaximumHeight(120)
        prompt_layout.addWidget(self.prompt_input)

        save_prompt_btn = QPushButton("Prompt speichern")
        save_prompt_btn.setObjectName("secondaryBtn")
        save_prompt_btn.clicked.connect(self._save_system_prompt)
        prompt_layout.addWidget(save_prompt_btn)

        layout.addWidget(prompt_card)

        # KI-Parameter
        param_card = QFrame()
        param_card.setObjectName("glassCard")
        param_layout = QVBoxLayout(param_card)
        param_layout.addWidget(QLabel("🎛️ KI-Parameter"))

        temp_layout = QHBoxLayout()
        temp_layout.addWidget(QLabel("Temperatur:"))
        self.temp_spin = QDoubleSpinBox()
        self.temp_spin.setRange(0.0, 1.0)
        self.temp_spin.setSingleStep(0.1)
        self.temp_spin.setValue(self.config.get_temperature())
        temp_layout.addWidget(self.temp_spin)
        temp_layout.addStretch()

        temp_layout.addWidget(QLabel("Max Tokens:"))
        self.tokens_spin = QSpinBox()
        self.tokens_spin.setRange(64, 4096)
        self.tokens_spin.setSingleStep(256)
        self.tokens_spin.setValue(self.config.get_max_tokens())
        temp_layout.addWidget(self.tokens_spin)

        param_layout.addLayout(temp_layout)

        save_params_btn = QPushButton("Parameter speichern")
        save_params_btn.setObjectName("secondaryBtn")
        save_params_btn.clicked.connect(self._save_params)
        param_layout.addWidget(save_params_btn)

        layout.addWidget(param_card)

        # Allgemeine Einstellungen
        general_card = QFrame()
        general_card.setObjectName("glassCard")
        general_layout = QVBoxLayout(general_card)
        general_layout.addWidget(QLabel("🎨 Allgemein"))

        theme_layout = QHBoxLayout()
        theme_layout.addWidget(QLabel("Theme:"))
        self.theme_combo = QComboBox()
        self.theme_combo.addItems(["dark", "light", "system"])
        self.theme_combo.setCurrentText(self.config.get_theme())
        self.theme_combo.currentTextChanged.connect(self._change_theme)
        theme_layout.addWidget(self.theme_combo)
        theme_layout.addStretch()

        self.aot_check = QCheckBox("Immer im Vordergrund")
        self.aot_check.setChecked(self.config.is_always_on_top())
        self.aot_check.stateChanged.connect(self._toggle_always_on_top)
        theme_layout.addWidget(self.aot_check)

        self.clip_check = QCheckBox("Clipboard-Monitor")
        self.clip_check.setChecked(self.config.get("clipboard_monitor", False))
        self.clip_check.stateChanged.connect(self._toggle_clipboard_monitor)
        theme_layout.addWidget(self.clip_check)

        general_layout.addLayout(theme_layout)
        layout.addWidget(general_card)

        layout.addStretch()

        page.setWidget(settings_widget)
        self.stack.addWidget(page)

    # --- Navigation ---

    def _switch_view(self, view_name: str) -> None:
        """Zwischen Ansichten wechseln."""
        view_map = {
            "Chat": 0,
            "Web-Suche": 1,
            "News": 2,
            "System": 3,
            "Notizen": 4,
            "Aufgaben": 5,
            "Einstellungen": 6,
        }
        index = view_map.get(view_name, 0)
        self.stack.setCurrentIndex(index)

        icons = ["💬", "🔍", "📰", "💻", "📝", "✅", "⚙️"]
        self.header_title.setText(f"{icons[index]} {view_name}")

        # Buttons aktualisieren
        for i, btn in enumerate(self.nav_buttons):
            btn.setChecked(i == index)

        # Daten laden wenn nötig
        if view_name == "System":
            self._update_system_info()
            self._refresh_processes()
        elif view_name == "Notizen":
            self._refresh_notes_list()
        elif view_name == "Aufgaben":
            self._refresh_tasks_list()

    # --- Timers ---

    def _setup_timers(self) -> None:
        """Timer für automatische Aktualisierung einrichten."""
        self.system_timer = QTimer()
        self.system_timer.timeout.connect(self._update_system_info)
        self.system_timer.start(3000)  # Alle 3 Sekunden

    # --- Chat ---

    def _new_chat(self) -> None:
        """Neue Chat-Sitzung starten."""
        self.chat_widget.new_session()
        self._switch_view("Chat")

    # --- Web-Suche ---

    def _do_web_search(self) -> None:
        """Web-Suche ausführen."""
        query = self.web_input.text().strip()
        if not query:
            return

        self.web_results.setText("Suche läuft...")

        if query.startswith(("http://", "https://")):
            # URL scrapen
            result = self.web_search.scrape_webpage(query)
            self.web_results.setText(self.web_search.format_scraped_content(result))
        else:
            # DuckDuckGo-Suche
            results = self.web_search.duckduckgo_search(query)
            self.web_results.setText(self.web_search.format_search_results(results))

    def _do_wikipedia_search(self) -> None:
        """Wikipedia-Suche ausführen."""
        query = self.web_input.text().strip()
        if not query:
            return
        self.web_results.setText("Wikipedia wird abgefragt...")
        result = self.web_search.wikipedia_summary(query)
        self.web_results.setText(result)

    def _send_web_result_to_chat(self) -> None:
        """Web-Ergebnis an Chat senden."""
        text = self.web_results.toPlainText().strip()
        if text:
            self.chat_widget.inject_context(text, "Web-Ergebnis")
            self._switch_view("Chat")

    def _on_search(self) -> None:
        """Suchleisten-Suche (Header)."""
        query = self.search_bar.text().strip()
        if query:
            self.web_input.setText(query)
            self._switch_view("Web-Suche")
            self._do_web_search()

    # --- News ---

    def _fetch_news(self) -> None:
        """Nachrichten laden."""
        feed_name = self.feed_combo.currentText()
        self.news_display.setText(f"Lade Nachrichten von {feed_name}...")
        articles = self.news_reader.fetch_feed(feed_name, max_items=5)
        self.news_display.setText(self.news_reader.format_articles(articles))

    def _summarize_news(self) -> None:
        """Nachrichten von KI zusammenfassen lassen."""
        if not self.nim_client:
            self.news_display.setText("⚠️ Kein API-Key konfiguriert.")
            return

        feed_name = self.feed_combo.currentText()
        prompt = self.news_reader.get_articles_for_ai_summary(feed_name)
        self.chat_widget.chat_input.setPlainText(prompt)
        self._switch_view("Chat")
        self.chat_widget.send_message()

    # --- System ---

    def _update_system_info(self) -> None:
        """System-Monitor-Werte aktualisieren."""
        if self.stack.currentIndex() != 3:
            return

        try:
            cpu = self.system_monitor.get_cpu_info()
            mem = self.system_monitor.get_memory_info()
            disks = self.system_monitor.get_disk_info()

            self.cpu_label.setText(f"{cpu['percent']}%")
            self.cpu_bar.setValue(int(cpu['percent']))

            self.ram_label.setText(f"{mem['percent']}%")
            self.ram_bar.setValue(int(mem['percent']))

            if disks:
                self.disk_label.setText(f"{disks[0]['percent']}%")
                self.disk_bar.setValue(int(disks[0]['percent']))
        except Exception:
            pass

    def _refresh_processes(self) -> None:
        """Prozess-Tabelle aktualisieren."""
        processes = self.system_monitor.get_processes("memory", 30)
        self.process_table.setRowCount(len(processes))
        for row, proc in enumerate(processes):
            self.process_table.setItem(row, 0, QTableWidgetItem(str(proc["pid"])))
            self.process_table.setItem(row, 1, QTableWidgetItem(proc["name"]))
            self.process_table.setItem(row, 2, QTableWidgetItem(f"{proc['cpu_percent']}"))
            self.process_table.setItem(row, 3, QTableWidgetItem(f"{proc['memory_percent']}"))
            self.process_table.setItem(row, 4, QTableWidgetItem(proc["status"]))

    def _kill_selected_process(self) -> None:
        """Ausgewählten Prozess beenden."""
        row = self.process_table.currentRow()
        if row < 0:
            return
        pid_item = self.process_table.item(row, 0)
        if not pid_item:
            return
        pid = int(pid_item.text())
        name_item = self.process_table.item(row, 1)
        name = name_item.text() if name_item else str(pid)

        reply = QMessageBox.question(
            self,
            "Prozess beenden",
            f"Möchtest du den Prozess '{name}' (PID {pid}) wirklich beenden?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            result = self.system_monitor.kill_process(pid)
            if result["success"]:
                self._refresh_processes()
            QMessageBox.information(self, "Prozess", result["message"])

    # --- Notizen ---

    def _refresh_notes_list(self) -> None:
        """Notizen-Liste aktualisieren."""
        notes = self.database.get_all_notes()
        self.notes_list.setRowCount(len(notes))
        for row, note in enumerate(notes):
            self.notes_list.setItem(row, 0, QTableWidgetItem(note["title"]))
            updated = note["updated_at"][:16].replace("T", " ") if note.get("updated_at") else ""
            self.notes_list.setItem(row, 1, QTableWidgetItem(updated))
            # ID als Daten speichern
            item = self.notes_list.item(row, 0)
            if item:
                item.setData(Qt.ItemDataRole.UserRole, note["id"])

    def _load_note(self, row: int, _col: int) -> None:
        """Notiz in den Editor laden."""
        item = self.notes_list.item(row, 0)
        if not item:
            return
        note_id = item.data(Qt.ItemDataRole.UserRole)
        note = self.database.get_note(note_id)
        if note:
            self._current_note_id = note_id
            self.note_title_input.setText(note["title"])
            self.note_editor.setPlainText(note["content"])

    def _add_note(self) -> None:
        """Neue Notiz erstellen."""
        self._current_note_id = None
        self.note_title_input.clear()
        self.note_editor.clear()
        self.note_title_input.setFocus()

    def _save_note(self) -> None:
        """Aktuelle Notiz speichern."""
        title = self.note_title_input.text().strip()
        content = self.note_editor.toPlainText().strip()
        if not title:
            QMessageBox.warning(self, "Notiz", "Bitte gib einen Titel ein.")
            return

        if self._current_note_id:
            self.database.update_note(self._current_note_id, title, content)
        else:
            self._current_note_id = self.database.add_note(title, content)

        self._refresh_notes_list()

    def _delete_note(self) -> None:
        """Aktuelle Notiz löschen."""
        if not self._current_note_id:
            return
        reply = QMessageBox.question(
            self, "Löschen", "Notiz wirklich löschen?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
        )
        if reply == QMessageBox.StandardButton.Yes:
            self.database.delete_note(self._current_note_id)
            self._current_note_id = None
            self.note_title_input.clear()
            self.note_editor.clear()
            self._refresh_notes_list()

    def _summarize_note(self) -> None:
        """Notiz-Inhalt von KI zusammenfassen lassen."""
        content = self.note_editor.toPlainText().strip()
        if not content or not self.nim_client:
            return
        prompt = f"Fasse den folgenden Text kurz zusammen:\n\n{content}"
        self.chat_widget.chat_input.setPlainText(prompt)
        self._switch_view("Chat")
        self.chat_widget.send_message()

    # --- Aufgaben ---

    def _refresh_tasks_list(self) -> None:
        """Aufgaben-Tabelle aktualisieren."""
        tasks = self.database.get_all_tasks()
        self.tasks_table.setRowCount(len(tasks))
        for row, task in enumerate(tasks):
            # Status-Checkbox
            status_btn = QPushButton("✓" if task["completed"] else "○")
            status_btn.setStyleSheet(
                f"color: {'#00D4FF' if task['completed'] else '#5a6577'}; "
                f"font-size: 18px; background: transparent; border: none;"
            )
            task_id = task["id"]
            status_btn.clicked.connect(lambda checked, tid=task_id: self._toggle_task(tid))
            self.tasks_table.setCellWidget(row, 0, status_btn)

            # Titel
            title_item = QTableWidgetItem(task["title"])
            if task["completed"]:
                font = title_item.font()
                font.setStrikeOut(True)
                title_item.setFont(font)
            title_item.setData(Qt.ItemDataRole.UserRole, task_id)
            self.tasks_table.setItem(row, 1, title_item)

            # Priorität
            prio_labels = {1: "🔴 Hoch", 2: "🟠 Mittel-Hoch", 3: "🟡 Normal", 4: "🟢 Niedrig", 5: "⚪ Gering"}
            self.tasks_table.setItem(row, 2, QTableWidgetItem(prio_labels.get(task["priority"], "Normal")))

            # Fälligkeitsdatum
            self.tasks_table.setItem(row, 3, QTableWidgetItem(task.get("due_date", "")))

            # Lösch-Button
            del_btn = QPushButton("🗑️")
            del_btn.setStyleSheet("background: transparent; border: none; font-size: 16px;")
            del_btn.clicked.connect(lambda checked, tid=task_id: self._delete_task(tid))
            self.tasks_table.setCellWidget(row, 4, del_btn)

    def _add_task(self) -> None:
        """Neue Aufgabe hinzufügen."""
        title, ok = QInputDialog.getText(self, "Neue Aufgabe", "Aufgabe:")
        if ok and title:
            self.database.add_task(title)
            self._refresh_tasks_list()

    def _toggle_task(self, task_id: int) -> None:
        """Aufgabe als erledigt/unerledigt markieren."""
        self.database.toggle_task(task_id)
        self._refresh_tasks_list()

    def _delete_task(self, task_id: int) -> None:
        """Aufgabe löschen."""
        self.database.delete_task(task_id)
        self._refresh_tasks_list()

    def _ai_prioritize_tasks(self) -> None:
        """KI-Priorisierungsvorschläge für Aufgaben."""
        if not self.nim_client:
            QMessageBox.warning(self, "Fehler", "Kein API-Key konfiguriert.")
            return
        tasks = self.database.get_all_tasks(show_completed=False)
        if not tasks:
            return
        task_list = "\n".join(f"- {t['title']}" for t in tasks)
        prompt = (
            f"Hier sind meine aktuellen Aufgaben:\n\n{task_list}\n\n"
            "Bitte schlage eine sinnvolle Priorisierung vor und begründe kurz, "
            "welche Aufgaben ich zuerst erledigen sollte."
        )
        self.chat_widget.chat_input.setPlainText(prompt)
        self._switch_view("Chat")
        self.chat_widget.send_message()

    # --- Einstellungen ---

    def _save_api_key(self) -> None:
        """API-Key speichern."""
        key = self.api_key_input.text().strip()
        if not key:
            QMessageBox.warning(self, "Fehler", "Bitte gib einen API-Key ein.")
            return

        self.config.set_api_key(key)
        self.nim_client = NIMClient(key)
        self.nim_client.set_system_prompt(self.config.get_system_prompt())
        self.nim_client.set_temperature(self.config.get_temperature())
        self.nim_client.set_max_tokens(self.config.get_max_tokens())
        self.chat_widget.set_nim_client(self.nim_client)

        QMessageBox.information(self, "Gespeichert", "API-Key wurde gespeichert und aktiviert.")

    def _save_system_prompt(self) -> None:
        """System-Prompt speichern."""
        prompt = self.prompt_input.toPlainText().strip()
        if prompt:
            self.config.set("system_prompt", prompt)
            if self.nim_client:
                self.nim_client.set_system_prompt(prompt)
            QMessageBox.information(self, "Gespeichert", "System-Prompt aktualisiert.")

    def _save_params(self) -> None:
        """KI-Parameter speichern."""
        self.config.set("temperature", self.temp_spin.value())
        self.config.set("max_tokens", self.tokens_spin.value())
        if self.nim_client:
            self.nim_client.set_temperature(self.temp_spin.value())
            self.nim_client.set_max_tokens(self.tokens_spin.value())
        QMessageBox.information(self, "Gespeichert", "KI-Parameter aktualisiert.")

    def _change_theme(self, theme: str) -> None:
        """Theme wechseln."""
        self.config.set_theme(theme)

    def _toggle_always_on_top(self, state: int) -> None:
        """Always-on-Top umschalten."""
        self.config.set("always_on_top", state == 2)
        if state == 2:
            self.setWindowFlags(self.windowFlags() | Qt.WindowType.WindowStaysOnTopHint)
        else:
            self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowStaysOnTopHint)
        self.show()

    def _toggle_clipboard_monitor(self, state: int) -> None:
        """Clipboard-Monitor ein/ausschalten."""
        enabled = state == 2
        self.config.set("clipboard_monitor", enabled)
        if enabled:
            self.clipboard_monitor.start_monitoring(self._on_clipboard_change)
        else:
            self.clipboard_monitor.stop_monitoring()

    def _on_clipboard_change(self, text: str) -> None:
        """Callback wenn sich die Zwischenablage ändert."""
        analysis = self.clipboard_monitor.analyze_clipboard_text(text)
        if analysis.get("suggestion"):
            self.statusBar().showMessage(
                f"📋 {analysis['type'].capitalize()}: {analysis['suggestion']}", 5000
            )

    def closeEvent(self, event) -> None:
        """Fenster-Schließen abfangen: In Tray minimieren."""
        event.ignore()
        self.hide()
