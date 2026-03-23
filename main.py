"""
LinkedCraft — AI LinkedIn Post Generator Engine
FastAPI backend with all AI logic as API endpoints.

Endpoints:
  POST /generate          — Generate LinkedIn posts from a topic
  POST /repurpose         — Repurpose existing content into LinkedIn posts
  POST /voice/analyze     — Analyze writing samples to build a voice profile
  POST /voice/test        — Generate a test post using a voice profile
  GET  /frameworks        — List all available post frameworks
  GET  /tones             — List all available tones
  GET  /audiences         — List all audience segments
  GET  /industries        — List all industries
  POST /analytics/score   — Score an existing LinkedIn post
  GET  /health            — Health check
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn

from config import settings
from models import (
    GenerateRequest,
    RepurposeRequest,
    VoiceAnalyzeRequest,
    VoiceTestRequest,
    ScoreRequest,
    GenerateResponse,
    VoiceProfileResponse,
    ScoreResponse,
    Framework,
    Tone,
    AudienceSegment,
)
from engine import LinkedCraftEngine
from data import FRAMEWORKS, TONES, AUDIENCE_SEGMENTS, INDUSTRIES

app = FastAPI(
    title="LinkedCraft API",
    description="AI-powered LinkedIn post generation engine with voice cloning, content repurposing, and audience targeting.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = LinkedCraftEngine(api_key=settings.ANTHROPIC_API_KEY, model=settings.MODEL)


# ──────────────────────────────────────────────
# Generation endpoints
# ──────────────────────────────────────────────

@app.post("/generate", response_model=GenerateResponse, tags=["Generation"])
async def generate_posts(req: GenerateRequest):
    """
    Generate LinkedIn posts from a topic/idea.

    Combines framework selection, tone, voice profile, and audience targeting
    to produce high-quality, ready-to-publish LinkedIn posts.
    """
    try:
        result = await engine.generate(
            topic=req.topic,
            framework=req.framework,
            tone=req.tone,
            post_count=req.post_count,
            voice_profile=req.voice_profile,
            audience_segments=req.audience_segments,
            industry=req.industry,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/repurpose", response_model=GenerateResponse, tags=["Generation"])
async def repurpose_content(req: RepurposeRequest):
    """
    Repurpose existing content (blog, podcast, newsletter, etc.) into LinkedIn posts.

    Extracts the most compelling insights and transforms them into
    platform-native LinkedIn content.
    """
    try:
        result = await engine.repurpose(
            content=req.content,
            source_type=req.source_type,
            focus_angle=req.focus_angle,
            framework=req.framework,
            tone=req.tone,
            post_count=req.post_count,
            voice_profile=req.voice_profile,
            audience_segments=req.audience_segments,
            industry=req.industry,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# Voice cloning endpoints
# ──────────────────────────────────────────────

@app.post("/voice/analyze", response_model=VoiceProfileResponse, tags=["Voice Cloning"])
async def analyze_voice(req: VoiceAnalyzeRequest):
    """
    Analyze writing samples to build a voice profile.

    Paste 3-5 LinkedIn posts and the AI extracts writing DNA:
    sentence structure, vocabulary, tone patterns, and signature moves.
    The returned profile can be passed to /generate and /repurpose.
    """
    try:
        result = await engine.analyze_voice(sample_posts=req.sample_posts)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice/test", response_model=GenerateResponse, tags=["Voice Cloning"])
async def test_voice(req: VoiceTestRequest):
    """
    Generate a test post using a voice profile to verify the clone quality.
    """
    try:
        result = await engine.generate(
            topic=req.topic or "A lesson I learned this week that changed my perspective",
            framework="storytelling",
            tone="conversational",
            post_count=1,
            voice_profile=req.voice_profile,
            audience_segments=[],
            industry=None,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# Analytics endpoints
# ──────────────────────────────────────────────

@app.post("/analytics/score", response_model=ScoreResponse, tags=["Analytics"])
async def score_post(req: ScoreRequest):
    """
    Score an existing LinkedIn post for quality, engagement potential,
    and get specific improvement suggestions.
    """
    try:
        result = await engine.score_post(content=req.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# Reference data endpoints
# ──────────────────────────────────────────────

@app.get("/frameworks", response_model=list[Framework], tags=["Reference Data"])
async def list_frameworks():
    """List all available post frameworks with descriptions and examples."""
    return FRAMEWORKS


@app.get("/tones", response_model=list[Tone], tags=["Reference Data"])
async def list_tones():
    """List all available writing tones."""
    return TONES


@app.get("/audiences", response_model=list[AudienceSegment], tags=["Reference Data"])
async def list_audiences():
    """List all audience segments for targeting."""
    return AUDIENCE_SEGMENTS


@app.get("/industries", response_model=list[str], tags=["Reference Data"])
async def list_industries():
    """List all supported industries."""
    return INDUSTRIES


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "1.0.0", "engine": "LinkedCraft"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
