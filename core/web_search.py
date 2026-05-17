"""
Web-Suche und Scraping-Modul.
Nutzt DuckDuckGo Instant Answer API und BeautifulSoup für Web-Scraping.
"""

import requests
from bs4 import BeautifulSoup
from typing import Optional
from urllib.parse import quote_plus


class WebSearch:
    """Web-Suche via DuckDuckGo und Webpage-Scraper."""

    DDGO_API = "https://api.duckduckgo.com/"
    WIKIPEDIA_API = "https://de.wikipedia.org/api/rest_v1/page/summary/"
    USER_AGENT = "Adex/1.0 (Desktop AI Assistant)"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.USER_AGENT})

    def duckduckgo_search(self, query: str) -> dict:
        """
        DuckDuckGo Instant Answer API abfragen.
        Gibt strukturierte Ergebnisse zurück.
        """
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1",
        }
        try:
            response = self.session.get(self.DDGO_API, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            result = {
                "abstract": data.get("AbstractText", ""),
                "abstract_source": data.get("AbstractSource", ""),
                "abstract_url": data.get("AbstractURL", ""),
                "answer": data.get("Answer", ""),
                "definition": data.get("Definition", ""),
                "related_topics": [],
            }

            # Verwandte Themen extrahieren
            for topic in data.get("RelatedTopics", [])[:5]:
                if "Text" in topic:
                    result["related_topics"].append({
                        "text": topic["Text"],
                        "url": topic.get("FirstURL", ""),
                    })

            return result

        except requests.exceptions.RequestException as e:
            return {"error": str(e)}

    def format_search_results(self, results: dict) -> str:
        """Suchergebnisse als lesbaren Text formatieren."""
        if "error" in results:
            return f"⚠️ Suchfehler: {results['error']}"

        parts = []

        if results["answer"]:
            parts.append(f"**Direkte Antwort:** {results['answer']}")

        if results["abstract"]:
            source = results["abstract_source"]
            url = results["abstract_url"]
            parts.append(f"**{source}:** {results['abstract']}")
            if url:
                parts.append(f"🔗 {url}")

        if results["definition"]:
            parts.append(f"**Definition:** {results['definition']}")

        if results["related_topics"]:
            parts.append("\n**Verwandte Themen:**")
            for topic in results["related_topics"]:
                parts.append(f"• {topic['text']}")

        if not parts:
            return "Keine Ergebnisse für diese Suche gefunden."

        return "\n".join(parts)

    def scrape_webpage(self, url: str) -> dict:
        """
        Webseite scrapen und Hauptinhalt extrahieren.
        Gibt Titel, Text und Meta-Informationen zurück.
        """
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            # Unnötige Elemente entfernen
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()

            title = soup.title.string.strip() if soup.title and soup.title.string else "Kein Titel"

            # Meta-Beschreibung extrahieren
            meta_desc = ""
            meta_tag = soup.find("meta", attrs={"name": "description"})
            if meta_tag and meta_tag.get("content"):
                meta_desc = meta_tag["content"]

            # Haupttext extrahieren
            text_parts = []
            for element in soup.find_all(["p", "h1", "h2", "h3", "h4", "li"]):
                text = element.get_text(strip=True)
                if len(text) > 20:  # Nur relevante Textblöcke
                    text_parts.append(text)

            content = "\n".join(text_parts[:50])  # Maximal 50 Blöcke

            # Auf sinnvolle Länge kürzen
            if len(content) > 5000:
                content = content[:5000] + "\n\n[... Text gekürzt ...]"

            return {
                "title": title,
                "description": meta_desc,
                "content": content,
                "url": url,
            }

        except requests.exceptions.RequestException as e:
            return {"error": str(e), "url": url}

    def format_scraped_content(self, data: dict) -> str:
        """Gescrapten Inhalt als lesbaren Text formatieren."""
        if "error" in data:
            return f"⚠️ Fehler beim Laden von {data['url']}: {data['error']}"

        parts = [
            f"# {data['title']}",
            f"🔗 {data['url']}",
        ]
        if data["description"]:
            parts.append(f"*{data['description']}*")
        parts.append("")
        parts.append(data["content"])
        return "\n".join(parts)

    def wikipedia_summary(self, term: str, lang: str = "de") -> str:
        """
        Wikipedia-Kurzabfrage: Zusammenfassung eines Begriffs.
        """
        base_url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/"
        url = base_url + quote_plus(term)

        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 404:
                return f"Kein Wikipedia-Artikel zu '{term}' gefunden."
            response.raise_for_status()
            data = response.json()

            title = data.get("title", term)
            extract = data.get("extract", "Keine Zusammenfassung verfügbar.")
            page_url = data.get("content_urls", {}).get("desktop", {}).get("page", "")

            result = f"# {title}\n\n{extract}"
            if page_url:
                result += f"\n\n🔗 {page_url}"
            return result

        except requests.exceptions.RequestException as e:
            return f"⚠️ Wikipedia-Fehler: {e}"
