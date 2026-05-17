"""
RSS-News-Reader-Modul.
Liest Nachrichten-Feeds und bereitet sie für KI-Zusammenfassung auf.
"""

import feedparser
from typing import Optional
from datetime import datetime


class NewsReader:
    """RSS/Atom News-Feed-Verarbeitung."""

    DEFAULT_FEEDS = {
        "Tagesschau": "https://www.tagesschau.de/xml/rss2/",
        "Heise": "https://www.heise.de/rss/heise-atom.xml",
        "BBC News": "http://feeds.bbci.co.uk/news/rss.xml",
        "Spiegel": "https://www.spiegel.de/schlagzeilen/tops/index.rss",
        "Golem.de": "https://rss.golem.de/rss.php?feed=RSS2.0",
    }

    def __init__(self, custom_feeds: Optional[dict[str, str]] = None):
        self.feeds = dict(self.DEFAULT_FEEDS)
        if custom_feeds:
            self.feeds.update(custom_feeds)

    def add_feed(self, name: str, url: str) -> None:
        """Neuen RSS-Feed hinzufügen."""
        self.feeds[name] = url

    def remove_feed(self, name: str) -> bool:
        """RSS-Feed entfernen."""
        if name in self.feeds:
            del self.feeds[name]
            return True
        return False

    def fetch_feed(self, feed_name: str, max_items: int = 5) -> list[dict]:
        """
        Einzelnen Feed abrufen und Artikel extrahieren.
        Gibt Liste von Artikel-Dicts zurück.
        """
        url = self.feeds.get(feed_name)
        if not url:
            return [{"error": f"Feed '{feed_name}' nicht gefunden."}]

        try:
            feed = feedparser.parse(url)
            if feed.bozo and not feed.entries:
                return [{"error": f"Feed '{feed_name}' konnte nicht gelesen werden."}]

            articles = []
            for entry in feed.entries[:max_items]:
                article = {
                    "title": entry.get("title", "Kein Titel"),
                    "summary": entry.get("summary", entry.get("description", "")),
                    "link": entry.get("link", ""),
                    "published": "",
                    "source": feed_name,
                }
                # Veröffentlichungsdatum parsen
                if "published_parsed" in entry and entry.published_parsed:
                    try:
                        dt = datetime(*entry.published_parsed[:6])
                        article["published"] = dt.strftime("%d.%m.%Y %H:%M")
                    except (TypeError, ValueError):
                        article["published"] = entry.get("published", "")
                elif "published" in entry:
                    article["published"] = entry["published"]

                # HTML aus Zusammenfassung entfernen
                if article["summary"]:
                    from bs4 import BeautifulSoup
                    article["summary"] = BeautifulSoup(
                        article["summary"], "html.parser"
                    ).get_text(strip=True)
                    # Kürzen wenn nötig
                    if len(article["summary"]) > 500:
                        article["summary"] = article["summary"][:500] + "..."

                articles.append(article)

            return articles

        except Exception as e:
            return [{"error": f"Fehler beim Laden von '{feed_name}': {e}"}]

    def fetch_all_feeds(self, max_per_feed: int = 3) -> dict[str, list[dict]]:
        """Alle konfigurierten Feeds abrufen."""
        results = {}
        for name in self.feeds:
            results[name] = self.fetch_feed(name, max_per_feed)
        return results

    def format_articles(self, articles: list[dict]) -> str:
        """Artikel-Liste als lesbaren Text formatieren."""
        if not articles:
            return "Keine Artikel verfügbar."

        if "error" in articles[0]:
            return f"⚠️ {articles[0]['error']}"

        parts = []
        for i, article in enumerate(articles, 1):
            date_str = f" ({article['published']})" if article["published"] else ""
            parts.append(f"### {i}. {article['title']}{date_str}")
            if article["summary"]:
                parts.append(article["summary"])
            if article["link"]:
                parts.append(f"🔗 {article['link']}")
            parts.append("")

        return "\n".join(parts)

    def get_articles_for_ai_summary(self, feed_name: str, max_items: int = 5) -> str:
        """
        Artikel-Text für KI-Zusammenfassung vorbereiten.
        Gibt kompakten Text zurück, der an die KI übergeben werden kann.
        """
        articles = self.fetch_feed(feed_name, max_items)
        if not articles or "error" in articles[0]:
            return self.format_articles(articles)

        parts = [f"Hier sind die aktuellen Top-{len(articles)} Artikel von {feed_name}:\n"]
        for i, article in enumerate(articles, 1):
            parts.append(f"{i}. **{article['title']}**")
            if article["summary"]:
                parts.append(f"   {article['summary']}")
            parts.append("")

        parts.append(
            "Bitte fasse diese Nachrichten kurz und prägnant zusammen "
            "und hebe die wichtigsten Punkte hervor."
        )
        return "\n".join(parts)

    def list_feeds(self) -> list[str]:
        """Liste aller konfigurierten Feed-Namen zurückgeben."""
        return list(self.feeds.keys())
