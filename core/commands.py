"""
Befehls-Parser für Chat-Eingaben.
Erkennt Kommandos für Datei-Operationen, Taschenrechner, Übersetzung
und leitet sie an die entsprechenden Module weiter.
"""

import os
import re
import math
from typing import Optional

from core.file_ops import FileAssistant
from core.web_search import WebSearch


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


class Translator:
    """Übersetzung über LibreTranslate API (kostenlos, kein Key nötig)."""

    LIBRE_URL = "https://libretranslate.com/translate"
    FALLBACK_URLS = [
        "https://translate.argosopentech.com/translate",
        "https://translate.terraprint.co/translate",
    ]

    LANG_MAP = {
        "englisch": "en", "deutsch": "de", "französisch": "fr",
        "spanisch": "es", "italienisch": "it", "portugiesisch": "pt",
        "russisch": "ru", "chinesisch": "zh", "japanisch": "ja",
        "koreanisch": "ko", "arabisch": "ar", "niederländisch": "nl",
        "polnisch": "pl", "türkisch": "tr", "hindi": "hi",
        "english": "en", "german": "de", "french": "fr",
        "spanish": "es", "italian": "it", "portuguese": "pt",
        "russian": "ru", "chinese": "zh", "japanese": "ja",
    }

    def translate(self, text: str, target: str = "en", source: str = "auto") -> str:
        """Text übersetzen."""
        import requests

        target_code = self.LANG_MAP.get(target.lower(), target.lower())
        source_code = self.LANG_MAP.get(source.lower(), source.lower())

        payload = {
            "q": text,
            "source": source_code,
            "target": target_code,
            "format": "text",
        }

        urls = [self.LIBRE_URL] + self.FALLBACK_URLS
        for url in urls:
            try:
                resp = requests.post(url, json=payload, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    translated = data.get("translatedText", "")
                    if translated:
                        return f"**Übersetzung ({target_code}):**\n{translated}"
                continue
            except Exception:
                continue

        return "⚠️ Übersetzungsdienst nicht erreichbar. Versuche es später erneut."


class CommandParser:
    """
    Erkennt eingebettete Kommandos in Chat-Nachrichten.
    Gibt (handled: bool, response: str) zurück.
    """

    def __init__(self, file_assistant: FileAssistant, web_search: WebSearch):
        self.file_assistant = file_assistant
        self.web_search = web_search
        self.calculator = Calculator()
        self.translator = Translator()

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

        # Übersetzung: "übersetze ... auf/ins ..."
        m = re.match(
            r"(?:übersetze|translate|übersetz)\s+[\"']?(.+?)[\"']?\s+(?:auf|ins?|to|nach)\s+(\w+)",
            lower,
        )
        if m:
            text = m.group(1).strip()
            target = m.group(2).strip()
            # Originaltext aus der Nachricht extrahieren (Groß-/Kleinschreibung beibehalten)
            orig_text = re.sub(
                r"(?i)(?:übersetze|translate|übersetz)\s+[\"']?(.+?)[\"']?\s+(?:auf|ins?|to|nach)\s+\w+",
                r"\1",
                msg,
            ).strip()
            result = self.translator.translate(orig_text or text, target)
            return (True, result)

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
            r"(?:wurzel|sqrt|sin|cos|tan|log)\s*\(?",
        ]
        return any(re.search(p, text) for p in calc_patterns)
