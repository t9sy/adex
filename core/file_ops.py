"""
Datei-Assistenz-Modul.
Dateien suchen, umbenennen, verschieben und verwalten.
"""

import os
import shutil
import subprocess
import platform
from pathlib import Path
from typing import Optional


class FileAssistant:
    """Datei-Operationen: Suchen, Umbenennen, Verschieben, Öffnen."""

    def __init__(self):
        self.home_dir = Path.home()

    def search_files(
        self,
        query: str,
        directory: Optional[str] = None,
        extensions: Optional[list[str]] = None,
        max_results: int = 50,
    ) -> list[dict]:
        """
        Dateien anhand von Name oder Muster suchen.
        Durchsucht rekursiv das angegebene Verzeichnis.
        """
        search_dir = Path(directory) if directory else self.home_dir
        if not search_dir.exists():
            return [{"error": f"Verzeichnis '{search_dir}' existiert nicht."}]

        results = []
        query_lower = query.lower()

        try:
            for path in search_dir.rglob("*"):
                if len(results) >= max_results:
                    break
                # Versteckte Ordner und Systemverzeichnisse überspringen
                parts = path.parts
                if any(p.startswith(".") or p in ("node_modules", "__pycache__", ".git") for p in parts):
                    continue

                if query_lower in path.name.lower():
                    # Erweiterungsfilter anwenden
                    if extensions and path.suffix.lower() not in [e.lower() for e in extensions]:
                        continue

                    try:
                        stat = path.stat()
                        results.append({
                            "path": str(path),
                            "name": path.name,
                            "is_dir": path.is_dir(),
                            "size_kb": round(stat.st_size / 1024, 2) if path.is_file() else 0,
                            "modified": stat.st_mtime,
                        })
                    except (PermissionError, OSError):
                        continue

        except PermissionError:
            return [{"error": f"Keine Berechtigung für '{search_dir}'."}]

        return results

    def rename_file(self, old_path: str, new_name: str) -> dict:
        """Datei oder Ordner umbenennen."""
        source = Path(old_path)
        if not source.exists():
            return {"success": False, "message": f"'{old_path}' existiert nicht."}

        target = source.parent / new_name
        if target.exists():
            return {"success": False, "message": f"'{new_name}' existiert bereits."}

        try:
            source.rename(target)
            return {
                "success": True,
                "message": f"Umbenannt: '{source.name}' → '{new_name}'",
                "new_path": str(target),
            }
        except (PermissionError, OSError) as e:
            return {"success": False, "message": f"Fehler beim Umbenennen: {e}"}

    def move_file(self, source_path: str, dest_dir: str) -> dict:
        """Datei oder Ordner in ein anderes Verzeichnis verschieben."""
        source = Path(source_path)
        dest = Path(dest_dir)

        if not source.exists():
            return {"success": False, "message": f"'{source_path}' existiert nicht."}
        if not dest.is_dir():
            return {"success": False, "message": f"Zielverzeichnis '{dest_dir}' existiert nicht."}

        target = dest / source.name
        if target.exists():
            return {"success": False, "message": f"'{source.name}' existiert bereits im Zielverzeichnis."}

        try:
            shutil.move(str(source), str(target))
            return {
                "success": True,
                "message": f"Verschoben: '{source.name}' → '{dest_dir}'",
                "new_path": str(target),
            }
        except (PermissionError, OSError) as e:
            return {"success": False, "message": f"Fehler beim Verschieben: {e}"}

    def copy_file(self, source_path: str, dest_dir: str) -> dict:
        """Datei oder Ordner kopieren."""
        source = Path(source_path)
        dest = Path(dest_dir)

        if not source.exists():
            return {"success": False, "message": f"'{source_path}' existiert nicht."}
        if not dest.is_dir():
            return {"success": False, "message": f"Zielverzeichnis '{dest_dir}' existiert nicht."}

        target = dest / source.name
        try:
            if source.is_dir():
                shutil.copytree(str(source), str(target))
            else:
                shutil.copy2(str(source), str(target))
            return {
                "success": True,
                "message": f"Kopiert: '{source.name}' → '{dest_dir}'",
                "new_path": str(target),
            }
        except (PermissionError, OSError) as e:
            return {"success": False, "message": f"Fehler beim Kopieren: {e}"}

    def delete_file(self, file_path: str, confirm: bool = False) -> dict:
        """
        Datei oder Ordner löschen.
        Erfordert confirm=True als Sicherheitsmaßnahme.
        """
        if not confirm:
            return {
                "success": False,
                "message": "Löschung erfordert Bestätigung (confirm=True).",
            }

        path = Path(file_path)
        if not path.exists():
            return {"success": False, "message": f"'{file_path}' existiert nicht."}

        try:
            if path.is_dir():
                shutil.rmtree(str(path))
            else:
                path.unlink()
            return {"success": True, "message": f"Gelöscht: '{path.name}'"}
        except (PermissionError, OSError) as e:
            return {"success": False, "message": f"Fehler beim Löschen: {e}"}

    def get_file_info(self, file_path: str) -> dict:
        """Detaillierte Informationen über eine Datei/Ordner abrufen."""
        path = Path(file_path)
        if not path.exists():
            return {"error": f"'{file_path}' existiert nicht."}

        try:
            stat = path.stat()
            info = {
                "name": path.name,
                "path": str(path.absolute()),
                "is_dir": path.is_dir(),
                "is_file": path.is_file(),
                "extension": path.suffix,
                "size_bytes": stat.st_size,
                "size_readable": self._format_size(stat.st_size),
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "parent": str(path.parent),
            }

            if path.is_dir():
                try:
                    items = list(path.iterdir())
                    info["items_count"] = len(items)
                    info["files_count"] = sum(1 for i in items if i.is_file())
                    info["dirs_count"] = sum(1 for i in items if i.is_dir())
                except PermissionError:
                    info["items_count"] = -1

            return info
        except (PermissionError, OSError) as e:
            return {"error": str(e)}

    def open_file(self, file_path: str) -> dict:
        """Datei mit der Standard-Anwendung öffnen."""
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "message": f"'{file_path}' existiert nicht."}

        try:
            if platform.system() == "Windows":
                os.startfile(str(path))
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])
            return {"success": True, "message": f"'{path.name}' wird geöffnet."}
        except Exception as e:
            return {"success": False, "message": f"Fehler beim Öffnen: {e}"}

    def open_application(self, app_name: str) -> dict:
        """Anwendung per Name starten (Windows-fokussiert)."""
        try:
            if platform.system() == "Windows":
                subprocess.Popen(["start", "", app_name], shell=True)
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", "-a", app_name])
            else:
                subprocess.Popen([app_name])
            return {"success": True, "message": f"'{app_name}' wird gestartet."}
        except FileNotFoundError:
            return {"success": False, "message": f"Anwendung '{app_name}' nicht gefunden."}
        except Exception as e:
            return {"success": False, "message": f"Fehler beim Starten: {e}"}

    def format_search_results(self, results: list[dict]) -> str:
        """Suchergebnisse als formatierten Text zurückgeben."""
        if not results:
            return "Keine Dateien gefunden."
        if "error" in results[0]:
            return f"⚠️ {results[0]['error']}"

        parts = [f"**{len(results)} Ergebnis(se) gefunden:**\n"]
        for r in results:
            icon = "📁" if r["is_dir"] else "📄"
            size = f" ({r['size_kb']} KB)" if not r["is_dir"] else ""
            parts.append(f"{icon} {r['name']}{size}")
            parts.append(f"   {r['path']}")

        return "\n".join(parts)

    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """Dateigröße in lesbares Format umwandeln."""
        for unit in ("B", "KB", "MB", "GB", "TB"):
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"
