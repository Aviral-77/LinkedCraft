"""
AI News Engine — Fetch trending AI topics and generate post ideas.

Flow:
  1. GET  /news/topics   → Fetches latest AI news, extracts trending topics
  2. POST /news/generate → User picks a topic, AI writes a LinkedIn post for it

Uses RSS feeds and web scraping for news, Claude for topic extraction and post generation.
"""

import httpx
import xml.etree.ElementTree as ET
from typing import Optional
from datetime import datetime, timezone

# ──────────────────────────────────────────────
# News sources — RSS feeds for AI/tech news
# ──────────────────────────────────────────────

NEWS_FEEDS = [
    {
        "name": "TechCrunch AI",
        "url": "https://techcrunch.com/category/artificial-intelligence/feed/",
        "category": "industry",
    },
    {
        "name": "MIT Technology Review AI",
        "url": "https://www.technologyreview.com/feed/",
        "category": "research",
    },
    {
        "name": "The Verge AI",
        "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
        "category": "industry",
    },
    {
        "name": "Ars Technica AI",
        "url": "https://feeds.arstechnica.com/arstechnica/technology-lab",
        "category": "tech",
    },
    {
        "name": "VentureBeat AI",
        "url": "https://venturebeat.com/category/ai/feed/",
        "category": "industry",
    },
]


async def fetch_rss_feed(url: str, max_items: int = 10) -> list[dict]:
    """Fetch and parse an RSS feed, returning article titles and descriptions."""
    articles = []
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "LinkedCraft/1.0"})
            if resp.status_code != 200:
                return []

        root = ET.fromstring(resp.text)

        # Handle both RSS 2.0 and Atom feeds
        # RSS 2.0
        items = root.findall(".//item")
        if items:
            for item in items[:max_items]:
                title = item.findtext("title", "").strip()
                desc = item.findtext("description", "").strip()
                link = item.findtext("link", "").strip()
                pub_date = item.findtext("pubDate", "").strip()
                if title:
                    articles.append({
                        "title": title,
                        "description": desc[:300] if desc else "",
                        "link": link,
                        "published": pub_date,
                    })
        else:
            # Atom feed
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall(".//atom:entry", ns)
            for entry in entries[:max_items]:
                title = entry.findtext("atom:title", "", ns).strip()
                summary = entry.findtext("atom:summary", "", ns).strip()
                link_elem = entry.find("atom:link", ns)
                link = link_elem.get("href", "") if link_elem is not None else ""
                pub = entry.findtext("atom:published", "", ns).strip()
                if title:
                    articles.append({
                        "title": title,
                        "description": summary[:300] if summary else "",
                        "link": link,
                        "published": pub,
                    })

    except Exception as e:
        print(f"[NEWS] Failed to fetch {url}: {e}")

    return articles


async def fetch_all_news(max_per_feed: int = 8) -> list[dict]:
    """Fetch articles from all configured RSS feeds."""
    all_articles = []
    for feed in NEWS_FEEDS:
        articles = await fetch_rss_feed(feed["url"], max_per_feed)
        for article in articles:
            article["source"] = feed["name"]
            article["category"] = feed["category"]
        all_articles.extend(articles)
    return all_articles


async def extract_topics(articles: list[dict], engine) -> list[dict]:
    """
    Use Claude to analyze fetched articles and extract trending LinkedIn-worthy topics.
    Returns a list of topic suggestions with context.
    """
    # Build a summary of articles for Claude to analyze
    article_summary = "\n".join(
        f"- [{a['source']}] {a['title']}: {a['description'][:150]}"
        for a in articles[:40]
    )

    system = """You are a LinkedIn content strategist who identifies the most engaging, discussion-worthy AI and tech topics from current news.

Your job is to analyze recent news articles and extract 8-12 distinct topic ideas that would make great LinkedIn posts. Focus on:
- Topics with strong opinions or debate potential
- News that impacts businesses, careers, or industries
- Stories with a human angle or practical implications
- Emerging trends people should know about

Output ONLY valid JSON, no markdown fences."""

    user_msg = f"""Here are the latest AI and tech news headlines:

{article_summary}

Extract 8-12 LinkedIn post topic ideas. For each topic:
1. Give it a catchy topic title
2. Write a 1-2 sentence angle that would make a compelling LinkedIn post
3. Suggest the best framework to use
4. Tag it with a category
5. Include the source article title for reference

Respond ONLY with valid JSON:
{{"topics": [{{"id": "1", "title": "Topic title", "angle": "The specific angle or take for LinkedIn", "suggested_framework": "hook-story-offer", "category": "industry|research|opinion|careers|tools", "source_headline": "Original article title", "trending_score": 8}}]}}

trending_score: 1-10 how likely this is to go viral on LinkedIn right now."""

    raw = await engine._call_api(system, user_msg)
    parsed = engine._parse_json(raw)

    return parsed.get("topics", [])


async def generate_from_news_topic(
    topic: dict,
    engine,
    tone: str = "conversational",
    framework: Optional[str] = None,
    voice_profile: Optional[str] = None,
    audience_segments: Optional[list[str]] = None,
    industry: Optional[str] = None,
) -> dict:
    """Generate a LinkedIn post from a selected news topic."""

    # Use the suggested framework if none provided
    fw = framework or topic.get("suggested_framework", "contrarian-take")

    # Build an enriched topic prompt
    enriched_topic = f"""{topic['title']}

Angle: {topic.get('angle', '')}
Context: This is based on recent news — "{topic.get('source_headline', '')}"

Write a LinkedIn post that shares a unique perspective, insight, or take on this topic.
Do NOT just summarize the news — add original analysis, a personal angle, or a bold opinion."""

    result = await engine.generate(
        topic=enriched_topic,
        framework=fw,
        tone=tone,
        post_count=1,
        voice_profile=voice_profile,
        audience_segments=audience_segments,
        industry=industry,
    )

    return result
