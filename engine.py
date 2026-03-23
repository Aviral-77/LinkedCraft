"""
LinkedCraft AI Engine — core prompt engineering and API integration.

Handles:
  - System prompt construction (voice, audience, industry)
  - Post generation prompts (frameworks, tones, variations)
  - Content repurposing prompts
  - Voice analysis prompts
  - Post scoring prompts
  - Anthropic API calls with structured JSON output
"""

import json
import httpx
from typing import Optional

from config import settings
from data import FRAMEWORKS, AUDIENCE_SEGMENTS


class LinkedCraftEngine:
    """Core AI engine that powers all generation, repurposing, voice cloning, and scoring."""

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.api_url = "https://api.anthropic.com/v1/messages"

    # ──────────────────────────────────────────
    # Private: API call
    # ──────────────────────────────────────────

    async def _call_api(self, system: str, user_message: str, max_tokens: int = None) -> str:
        """Make a single call to the Anthropic Messages API and return the text response."""
        headers = {
            "x-api-key": self.api_key,
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
        }
        payload = {
            "model": self.model,
            "max_tokens": max_tokens or settings.MAX_TOKENS,
            "system": system,
            "messages": [{"role": "user", "content": user_message}],
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        # Extract text from content blocks
        text = "".join(block.get("text", "") for block in data.get("content", []))
        return text

    def _parse_json(self, text: str) -> dict:
        """Safely parse JSON from API response, stripping markdown fences if present."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            # Remove ```json and ``` wrappers
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()
        return json.loads(cleaned)

    # ──────────────────────────────────────────
    # Private: Prompt builders
    # ──────────────────────────────────────────

    def _build_system_prompt(
        self,
        voice_profile: Optional[str] = None,
        audience_segments: Optional[list[str]] = None,
        industry: Optional[str] = None,
    ) -> str:
        """Build the system prompt with voice, audience, and industry context."""

        prompt = """You are an elite LinkedIn ghostwriter and content strategist. Your job is to generate high-performing LinkedIn posts that feel authentic, human, and engaging — never generic or AI-sounding.

CRITICAL RULES:
- Never use hashtags unless explicitly asked
- Never use emojis excessively (1-2 max per post, only if natural)
- Write in short paragraphs (1-2 sentences each) with line breaks for readability
- The first line (hook) is EVERYTHING — it must stop the scroll
- End with either a question, a bold statement, or a clear CTA
- Avoid corporate jargon, buzzwords, and clichés like "leverage", "synergy", "game-changer"
- Sound like a real human sharing genuine insights, not a marketing bot
- Keep posts between 150-300 words unless carousel format
- Output ONLY valid JSON, no markdown fences, no commentary"""

        if voice_profile and voice_profile.strip():
            prompt += f"\n\nVOICE PROFILE — Match this writing style closely:\n{voice_profile}"

        if audience_segments:
            # Resolve IDs to labels
            labels = []
            for seg_id in audience_segments:
                match = next((s for s in AUDIENCE_SEGMENTS if s["id"] == seg_id), None)
                if match:
                    labels.append(match["label"])
                else:
                    labels.append(seg_id)
            prompt += f"\n\nTARGET AUDIENCE: {', '.join(labels)}. Tailor the content, examples, and language to resonate with this audience. Use references and pain points they'd recognize."

        if industry:
            prompt += f"\n\nINDUSTRY CONTEXT: {industry}. Use industry-specific examples, trends, and terminology where natural."

        return prompt

    def _build_generation_prompt(
        self,
        topic: str,
        framework: Optional[str] = None,
        tone: str = "conversational",
        post_count: int = 1,
    ) -> str:
        """Build the user prompt for post generation."""

        prompt = f"Generate {post_count} LinkedIn post(s) about: {topic}"

        if framework:
            fw = next((f for f in FRAMEWORKS if f["id"] == framework), None)
            if fw:
                prompt += f'\n\nUse the "{fw["name"]}" framework:\n{fw["structure"]}\n\nExample of this style:\n{fw["example"]}'

        prompt += f"\n\nTone: {tone}. Make sure the writing style consistently matches this tone throughout."

        if post_count > 1:
            prompt += f'\n\nGenerate exactly {post_count} distinct posts, each with a different angle or hook.'

        prompt += """

Respond ONLY with valid JSON (no markdown, no explanation). Format:
{"posts": [{"content": "the full post text", "hook_score": 8, "engagement_prediction": "high", "best_time": "Tue 9am", "tip": "one specific suggestion"}]}

hook_score: 1-10 rating of how strong the opening hook is.
engagement_prediction: "low", "medium", "high", or "viral".
best_time: suggested posting time (day + time).
tip: one specific suggestion to improve engagement further."""

        return prompt

    def _build_repurpose_prompt(
        self,
        content: str,
        source_type: str = "blog",
        focus_angle: Optional[str] = None,
        framework: Optional[str] = None,
        tone: str = "conversational",
        post_count: int = 3,
    ) -> str:
        """Build the user prompt for content repurposing."""

        # Truncate content to avoid token limits
        truncated = content[: settings.MAX_CONTENT_LENGTH]

        prompt = f"""CONTENT REPURPOSING TASK:
Source type: {source_type}
Source content:
---
{truncated}
---

Extract the most compelling insights from this content and transform them into {post_count} distinct LinkedIn post(s). Each post should stand alone and highlight a different insight or angle."""

        if focus_angle:
            prompt += f"\nFocus angle: {focus_angle}"

        if framework:
            fw = next((f for f in FRAMEWORKS if f["id"] == framework), None)
            if fw:
                prompt += f'\n\nUse the "{fw["name"]}" framework:\n{fw["structure"]}'

        prompt += f"\n\nTone: {tone}"

        prompt += """

Respond ONLY with valid JSON (no markdown, no explanation). Format:
{"posts": [{"content": "the full post text", "hook_score": 8, "engagement_prediction": "high", "best_time": "Tue 9am", "tip": "one specific suggestion"}]}"""

        return prompt

    def _build_voice_analysis_prompt(self, sample_posts: str) -> str:
        """Build the prompt for voice profile extraction."""

        return f"""Analyze these LinkedIn posts and extract a detailed voice profile. Identify:

1. SENTENCE STRUCTURE: Average length, use of fragments, rhetorical questions
2. VOCABULARY: Formal vs informal, industry jargon, unique phrases they repeat
3. TONE PATTERNS: Emotional range, humor style, vulnerability level
4. FORMATTING HABITS: Line breaks, emoji usage, hashtag patterns, list vs prose
5. SIGNATURE MOVES: Recurring hooks, closings, storytelling patterns
6. TOPICS & THEMES: What they consistently talk about

Sample posts:
---
{sample_posts}
---

Respond ONLY with valid JSON (no markdown, no explanation). Format:
{{"voice_profile": "A detailed paragraph describing how this person writes, their style, quirks, and patterns that should be replicated", "key_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"], "avoid": ["things this person would never write"]}}"""

    def _build_score_prompt(self, content: str) -> str:
        """Build the prompt for post scoring and analysis."""

        return f"""Analyze this LinkedIn post and provide a detailed quality score.

Post:
---
{content}
---

Evaluate on these dimensions:
1. HOOK STRENGTH (1-10): Does the first line stop the scroll?
2. READABILITY (1-10): Short paragraphs, scannable, good formatting?
3. ENGAGEMENT (1-10): Will people comment, like, share? Does it invite interaction?
4. AUTHENTICITY (1-10): Does it sound human and genuine, or like AI/corporate speak?

Respond ONLY with valid JSON (no markdown, no explanation). Format:
{{"overall_score": 75, "hook_score": 8, "readability_score": 7, "engagement_score": 8, "authenticity_score": 6, "strengths": ["what it does well"], "improvements": ["specific actionable suggestions"], "rewritten_hook": "A stronger alternative opening line"}}"""

    # ──────────────────────────────────────────
    # Public methods
    # ──────────────────────────────────────────

    async def generate(
        self,
        topic: str,
        framework: Optional[str] = None,
        tone: str = "conversational",
        post_count: int = 1,
        voice_profile: Optional[str] = None,
        audience_segments: Optional[list[str]] = None,
        industry: Optional[str] = None,
    ) -> dict:
        """Generate LinkedIn posts from a topic."""

        system = self._build_system_prompt(voice_profile, audience_segments, industry)
        user_msg = self._build_generation_prompt(topic, framework, tone, post_count)

        raw = await self._call_api(system, user_msg)
        parsed = self._parse_json(raw)

        return {
            "posts": parsed.get("posts", []),
            "framework_used": framework,
            "tone_used": tone,
            "voice_applied": bool(voice_profile),
        }

    async def repurpose(
        self,
        content: str,
        source_type: str = "blog",
        focus_angle: Optional[str] = None,
        framework: Optional[str] = None,
        tone: str = "conversational",
        post_count: int = 3,
        voice_profile: Optional[str] = None,
        audience_segments: Optional[list[str]] = None,
        industry: Optional[str] = None,
    ) -> dict:
        """Repurpose existing content into LinkedIn posts."""

        system = self._build_system_prompt(voice_profile, audience_segments, industry)
        user_msg = self._build_repurpose_prompt(content, source_type, focus_angle, framework, tone, post_count)

        raw = await self._call_api(system, user_msg)
        parsed = self._parse_json(raw)

        return {
            "posts": parsed.get("posts", []),
            "framework_used": framework,
            "tone_used": tone,
            "voice_applied": bool(voice_profile),
        }

    async def analyze_voice(self, sample_posts: str) -> dict:
        """Analyze writing samples and return a voice profile."""

        system = "You are a world-class writing style analyst. Extract precise, actionable voice profiles from writing samples. Output only valid JSON."
        user_msg = self._build_voice_analysis_prompt(sample_posts)

        raw = await self._call_api(system, user_msg)
        parsed = self._parse_json(raw)

        return {
            "voice_profile": parsed.get("voice_profile", ""),
            "key_traits": parsed.get("key_traits", []),
            "avoid": parsed.get("avoid", []),
        }

    async def score_post(self, content: str) -> dict:
        """Score an existing LinkedIn post."""

        system = "You are a LinkedIn content strategist who analyzes posts for engagement potential. Be specific and actionable in your feedback. Output only valid JSON."
        user_msg = self._build_score_prompt(content)

        raw = await self._call_api(system, user_msg)
        parsed = self._parse_json(raw)

        return {"score": parsed}
