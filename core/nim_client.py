"""
NVIDIA NIM API Client mit Streaming-Support.
Verbindet sich mit dem meta/llama-3.1-70b-instruct Modell.
"""

import json
import requests
from typing import Generator, Optional


class NIMClient:
    """Client für die NVIDIA NIM API mit Streaming-Unterstützung."""

    API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
    MODEL = "meta/llama-3.1-70b-instruct"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.default_system_prompt = (
            "Du bist Adex, ein intelligenter und hilfsbreiter KI-Assistent. "
            "Du antwortest präzise, freundlich und hilfreich. "
            "Wenn du Code schreibst, nutze Markdown-Code-Blöcke mit Sprachangabe."
        )
        self.temperature = 0.7
        self.max_tokens = 2048
        self.conversation_history: list[dict] = []
        self.max_history = 20  # Letzte N Nachrichten als Kontext

    def set_system_prompt(self, prompt: str) -> None:
        """System-Prompt konfigurieren (Persönlichkeit, Sprache, Fachgebiet)."""
        self.default_system_prompt = prompt

    def set_temperature(self, temp: float) -> None:
        """Temperatur für Antwort-Kreativität setzen (0.0 - 1.0)."""
        self.temperature = max(0.0, min(1.0, temp))

    def set_max_tokens(self, tokens: int) -> None:
        """Maximale Antwortlänge festlegen."""
        self.max_tokens = max(64, min(4096, tokens))

    def clear_history(self) -> None:
        """Konversationsverlauf löschen."""
        self.conversation_history.clear()

    def add_to_history(self, role: str, content: str) -> None:
        """Nachricht zum Verlauf hinzufügen, alte Nachrichten entfernen."""
        self.conversation_history.append({"role": role, "content": content})
        # Konversations-Gedächtnis begrenzen
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-self.max_history:]

    def build_messages(self, user_message: str, system_prompt: Optional[str] = None) -> list[dict]:
        """Nachrichten-Array für API-Anfrage zusammenstellen."""
        messages = [
            {
                "role": "system",
                "content": system_prompt or self.default_system_prompt,
            }
        ]
        # Konversationsverlauf anhängen
        messages.extend(self.conversation_history)
        # Aktuelle Benutzernachricht hinzufügen
        messages.append({"role": "user", "content": user_message})
        return messages

    def stream_chat(
        self,
        user_message: str,
        system_prompt: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Streaming-Antwort von der NIM API.
        Gibt Token für Token zurück (Generator).
        """
        messages = self.build_messages(user_message, system_prompt)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": True,
        }

        full_response = ""
        try:
            with requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                stream=True,
                timeout=60,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data: "):
                        data_str = line_str[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                full_response += content
                                yield content
                        except (json.JSONDecodeError, IndexError, KeyError):
                            continue

            # Nach erfolgreicher Antwort: Verlauf aktualisieren
            self.add_to_history("user", user_message)
            self.add_to_history("assistant", full_response)

        except requests.exceptions.ConnectionError:
            yield "\n⚠️ Verbindungsfehler: Keine Internetverbindung oder API nicht erreichbar."
        except requests.exceptions.Timeout:
            yield "\n⚠️ Zeitüberschreitung: Die API hat nicht rechtzeitig geantwortet."
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else "unbekannt"
            if status == 401:
                yield "\n⚠️ Ungültiger API-Key. Bitte überprüfe deinen NVIDIA NIM API-Schlüssel."
            elif status == 429:
                yield "\n⚠️ Rate-Limit erreicht. Bitte warte einen Moment und versuche es erneut."
            else:
                yield f"\n⚠️ API-Fehler (Status {status}): {e}"
        except requests.exceptions.RequestException as e:
            yield f"\n⚠️ Netzwerkfehler: {e}"

    def chat_sync(
        self,
        user_message: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Synchrone Chat-Anfrage (wartet auf vollständige Antwort)."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        messages = self.build_messages(user_message, system_prompt)
        payload = {
            "model": self.MODEL,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": False,
        }

        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            self.add_to_history("user", user_message)
            self.add_to_history("assistant", content)
            return content
        except requests.exceptions.RequestException as e:
            return f"⚠️ Fehler bei der API-Anfrage: {e}"

    def validate_api_key(self) -> bool:
        """Prüft ob der API-Key gültig ist."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.MODEL,
            "messages": [{"role": "user", "content": "Hi"}],
            "max_tokens": 5,
            "stream": False,
        }
        try:
            response = requests.post(
                self.API_URL,
                headers=headers,
                json=payload,
                timeout=15,
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
