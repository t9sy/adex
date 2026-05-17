"""
Befehls-Parser für Chat-Eingaben.
Erkennt Kommandos für Datei-Operationen, Taschenrechner, Übersetzung
und leitet sie an die entsprechenden Module weiter.
"""

import os
import re
import math
from typing import Optional, TYPE_CHECKING

from core.file_ops import FileAssistant
from core.web_search import WebSearch

if TYPE_CHECKING:
    from core.nim_client import NIMClient


class Calculator:
    """Natürlichsprachlicher Taschenrechner."""

    SAFE_NAMES = {
        "abs": abs, "round": round, "min": min, "max": max,
        "sqrt": math.sqrt, "sin": math.sin, "cos": math.cos,
        "tan": math.tan, "log": math.log, "log10": math.log10,
        "pi": math.pi, "e": math.e, "pow": pow, "ceil": math.ceil,
        "floor": math.floor,
    }

    def calculate(self, expression: str) -> str:
        """Mathematischen Ausdruck auswerten (sicher, ohne exec)."""
        cleaned = self._normalize(expression)
        if not cleaned:
            return "Kein gültiger Ausdruck erkannt."

        try:
            result = eval(cleaned, {"__builtins__": {}}, self.SAFE_NAMES)
            if isinstance(result, float):
                if result == int(result) and abs(result) < 1e15:
                    result = int(result)
                else:
                    result = round(result, 10)
            return f"**Ergebnis:** {result}"
        except ZeroDivisionError:
            return "⚠️ Division durch Null ist nicht erlaubt."
        except Exception as e:
            return f"⚠️ Konnte Ausdruck nicht auswerten: {e}"

    def _normalize(self, text: str) -> str:
        """Natürlichsprachliche Eingabe in mathematischen Ausdruck umwandeln."""
        t = text.lower().strip()
        # Prozentrechnung: "15% von 847" → 0.15 * 847
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*%\s*(?:von|of)\s*(\d+(?:[.,]\d+)?)", t)
        if m:
            pct = m.group(1).replace(",", ".")
            base = m.group(2).replace(",", ".")
            return f"{pct} / 100 * {base}"

        # "Was ist ... ?" entfernen
        t = re.sub(r"(was ist|berechne|rechne|wie viel ist|what is|calculate)\s*", "", t)
        t = re.sub(r"\?$", "", t).strip()

        # Währungssymbole und Einheiten entfernen
        t = re.sub(r"[€$£¥]", "", t)
        # Komma als Dezimaltrennzeichen
        t = re.sub(r"(\d),(\d)", r"\1.\2", t)
        # Wörter durch Operatoren ersetzen
        replacements = [
            (r"\bplus\b", "+"), (r"\bminus\b", "-"),
            (r"\bmal\b", "*"), (r"\btimes\b", "*"),
            (r"\bgeteilt\s*durch\b", "/"), (r"\bdivided\s*by\b", "/"),
            (r"\bhoch\b", "**"), (r"\bpower\b", "**"),
            (r"\bwurzel\s*(?:von|aus)?\s*(\d+(?:\.\d+)?)", r"sqrt(\1)"),
            (r"\bwurzel\s*(?:von|aus)?\b", "sqrt"),
            (r"\bmodulo\b", "%"),
        ]
        for pattern, repl in replacements:
            t = re.sub(pattern, repl, t)

        t = t.strip()
        # Nur erlaubte Zeichen
        if re.match(r"^[\d\s+\-*/().,%epi\w]+$", t):
            return t
        return ""


class CommandParser:
    """
    Erkennt eingebettete Kommandos in Chat-Nachrichten.
    Gibt (handled: bool, response: str) zurück.
    Übersetzung läuft über die NIM API (kein LibreTranslate nötig).
    """

    def __init__(
        self,
        file_assistant: FileAssistant,
        web_search: WebSearch,
        nim_client: "Optional[NIMClient]" = None,
    ):
        self.file_assistant = file_assistant
        self.web_search = web_search
        self.nim_client = nim_client
        self.calculator = Calculator()

    def try_parse(self, message: str) -> tuple[bool, str]:
        """
        Versucht ein Kommando in der Nachricht zu erkennen.
        Returns (True, response) bei Treffer, (False, "") sonst.
        """
        msg = message.strip()
        lower = msg.lower()

        # Taschenrechner
        if self._is_calculation(lower):
            result = self.calculator.calculate(msg)
            return (True, result)

        # Übersetzung: "übersetze ... auf/ins ..." → über NIM API (streamed)
        m = re.match(
            r"(?:übersetze|translate|übersetz)\s+[\"']?(.+?)[\"']?\s+(?:auf|ins?|to|nach)\s+(\w+)",
            lower,
        )
        if m:
            target = m.group(2).strip()
            orig_text = re.sub(
                r"(?i)(?:übersetze|translate|übersetz)\s+[\"']?(.+?)[\"']?\s+(?:auf|ins?|to|nach)\s+\w+",
                r"\1",
                msg,
            ).strip()
            if self.nim_client:
                return (True, f"__TRANSLATE__:{target}:{orig_text}")
            return (True, "⚠️ Kein API-Key konfiguriert. Übersetzung benötigt die NVIDIA NIM API.")

        # Dateisuche: "suche datei ...", "finde datei ..."
        m = re.match(r"(?:suche|finde|such)\s+(?:datei|datein|file|files?)\s+(.+)", lower)
        if m:
            query = m.group(1).strip()
            results = self.file_assistant.search_files(query)
            formatted = self.file_assistant.format_search_results(results)
            return (True, formatted)

        # Datei öffnen: "öffne ..."
        m = re.match(r"(?:öffne|open|starte|start)\s+(.+)", lower)
        if m:
            target = m.group(1).strip().strip("\"'")
            if os.path.exists(target):
                result = self.file_assistant.open_file(target)
            else:
                result = self.file_assistant.open_application(target)
            return (True, result.get("message", str(result)))

        return (False, "")

    def _is_calculation(self, text: str) -> bool:
        """Prüft ob der Text eine Berechnung ist."""
        calc_patterns = [
            r"\d+\s*[+\-*/]\s*\d+",
            r"\d+\s*%\s*(?:von|of)\s*\d+",
            r"(?:was ist|berechne|rechne|wie viel|calculate|what is)\s+\d",
            r"(?:wurzel|sqrt|sin|cos|tan|log)[\s(]",
        ]
        return any(re.search(p, text) for p in calc_patterns)
