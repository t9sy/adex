"""
SQLite-Datenbank-Modul.
Verwaltet Notizen, Chat-Verlauf, Aufgaben und Einstellungen.
"""

import sqlite3
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional


class Database:
    """SQLite-Datenbank für Adex-Daten."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "adex.db")
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        """Datenbankverbindung herstellen."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self) -> None:
        """Datenbanktabellen erstellen falls nicht vorhanden."""
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL DEFAULT '',
                    summary TEXT DEFAULT '',
                    tags TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    pinned INTEGER DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    priority INTEGER DEFAULT 3,
                    completed INTEGER DEFAULT 0,
                    due_date TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    completed_at TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);
                CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
            """)
            conn.commit()
        finally:
            conn.close()

    # --- Notizen ---

    def add_note(self, title: str, content: str, tags: str = "", summary: str = "") -> int:
        """Neue Notiz erstellen. Gibt die ID zurück."""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            cursor = conn.execute(
                "INSERT INTO notes (title, content, tags, summary, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (title, content, tags, summary, now, now),
            )
            conn.commit()
            return cursor.lastrowid or 0
        finally:
            conn.close()

    def update_note(self, note_id: int, title: str, content: str, tags: str = "", summary: str = "") -> bool:
        """Notiz aktualisieren."""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            cursor = conn.execute(
                "UPDATE notes SET title=?, content=?, tags=?, summary=?, updated_at=? WHERE id=?",
                (title, content, tags, summary, now, note_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_note(self, note_id: int) -> bool:
        """Notiz löschen."""
        conn = self._get_conn()
        try:
            cursor = conn.execute("DELETE FROM notes WHERE id=?", (note_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_note(self, note_id: int) -> Optional[dict]:
        """Einzelne Notiz abrufen."""
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_all_notes(self, search: str = "") -> list[dict]:
        """Alle Notizen abrufen, optional mit Suchfilter."""
        conn = self._get_conn()
        try:
            if search:
                rows = conn.execute(
                    "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? "
                    "ORDER BY pinned DESC, updated_at DESC",
                    (f"%{search}%", f"%{search}%", f"%{search}%"),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"
                ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def toggle_note_pin(self, note_id: int) -> bool:
        """Notiz anheften/lösen."""
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE notes SET pinned = CASE WHEN pinned = 0 THEN 1 ELSE 0 END WHERE id=?",
                (note_id,),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    # --- Chat-Verlauf ---

    def save_chat_message(self, session_id: str, role: str, content: str) -> None:
        """Chat-Nachricht speichern."""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute(
                "INSERT INTO chat_history (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
                (session_id, role, content, now),
            )
            conn.commit()
        finally:
            conn.close()

    def get_chat_history(self, session_id: str, limit: int = 50) -> list[dict]:
        """Chat-Verlauf einer Sitzung abrufen."""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM chat_history WHERE session_id=? ORDER BY timestamp ASC LIMIT ?",
                (session_id, limit),
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def get_chat_sessions(self) -> list[dict]:
        """Alle Chat-Sitzungen mit letzter Nachricht auflisten."""
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT session_id, MAX(timestamp) as last_message, COUNT(*) as msg_count "
                "FROM chat_history GROUP BY session_id ORDER BY last_message DESC"
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def delete_chat_session(self, session_id: str) -> bool:
        """Chat-Sitzung löschen."""
        conn = self._get_conn()
        try:
            cursor = conn.execute("DELETE FROM chat_history WHERE session_id=?", (session_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    # --- Aufgaben ---

    def add_task(self, title: str, description: str = "", priority: int = 3, due_date: str = "") -> int:
        """Neue Aufgabe erstellen. Priorität: 1 (hoch) bis 5 (niedrig)."""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            cursor = conn.execute(
                "INSERT INTO tasks (title, description, priority, due_date, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (title, description, priority, due_date, now),
            )
            conn.commit()
            return cursor.lastrowid or 0
        finally:
            conn.close()

    def update_task(self, task_id: int, title: str, description: str = "",
                    priority: int = 3, due_date: str = "") -> bool:
        """Aufgabe aktualisieren."""
        conn = self._get_conn()
        try:
            cursor = conn.execute(
                "UPDATE tasks SET title=?, description=?, priority=?, due_date=? WHERE id=?",
                (title, description, priority, due_date, task_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def toggle_task(self, task_id: int) -> bool:
        """Aufgabe als erledigt/unerledigt markieren."""
        now = datetime.now().isoformat()
        conn = self._get_conn()
        try:
            conn.execute(
                "UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END, "
                "completed_at = CASE WHEN completed = 0 THEN ? ELSE '' END WHERE id=?",
                (now, task_id),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def delete_task(self, task_id: int) -> bool:
        """Aufgabe löschen."""
        conn = self._get_conn()
        try:
            cursor = conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_all_tasks(self, show_completed: bool = True) -> list[dict]:
        """Alle Aufgaben abrufen, sortiert nach Priorität."""
        conn = self._get_conn()
        try:
            if show_completed:
                rows = conn.execute(
                    "SELECT * FROM tasks ORDER BY completed ASC, priority ASC, created_at DESC"
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM tasks WHERE completed=0 ORDER BY priority ASC, created_at DESC"
                ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    # --- Einstellungen ---

    def set_setting(self, key: str, value: str) -> None:
        """Einstellung speichern (überschreibt vorhandene)."""
        conn = self._get_conn()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, value),
            )
            conn.commit()
        finally:
            conn.close()

    def get_setting(self, key: str, default: str = "") -> str:
        """Einstellung lesen."""
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
            return row["value"] if row else default
        finally:
            conn.close()

    def get_all_settings(self) -> dict[str, str]:
        """Alle Einstellungen als Dict abrufen."""
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
            return {row["key"]: row["value"] for row in rows}
        finally:
            conn.close()
