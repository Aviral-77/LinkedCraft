"""
LinkedCraft — AI LinkedIn Post Generator Engine v3.0
FastAPI backend with auth, LinkedIn OAuth, scheduling, and AI news.

Public endpoints (no auth):
  POST /auth/register        — Create a new account
  POST /auth/login           — Login and get JWT token
  GET  /frameworks           — List post frameworks
  GET  /tones                — List tones
  GET  /audiences            — List audience segments
  GET  /industries           — List industries
  GET  /health               — Health check

Protected endpoints (require Bearer token or X-Api-Key):
  GET  /auth/me              — Get current user profile
  POST /auth/api-keys        — Generate an API key
  GET  /auth/api-keys        — List your API keys
  DELETE /auth/api-keys/{prefix} — Revoke an API key
  POST /generate             — Generate LinkedIn posts
  POST /repurpose            — Repurpose content into posts
  POST /voice/analyze        — Analyze voice and save to profile
  POST /voice/test           — Test a voice profile
  POST /analytics/score      — Score a post
  GET  /news/topics          — Get trending AI topics
  POST /news/generate        — Generate post from a news topic
  POST /schedule             — Schedule a post
  GET  /schedule             — List scheduled posts
  GET  /schedule/{id}        — Get scheduled post
  PUT  /schedule/{id}        — Update scheduled post
  DELETE /schedule/{id}      — Cancel scheduled post
  GET  /linkedin/auth        — Start LinkedIn OAuth flow
  GET  /linkedin/callback    — OAuth callback
  POST /linkedin/publish     — Publish post to LinkedIn
  GET  /linkedin/status      — Check LinkedIn connection status
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import asyncio
import json
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
    SchedulePostRequest,
    UpdateScheduledPostRequest,
    ScheduledPostResponse,
    NewsTopicsResponse,
    NewsGenerateRequest,
    Framework,
    Tone,
    AudienceSegment,
)
from engine import LinkedCraftEngine
from data import FRAMEWORKS, TONES, AUDIENCE_SEGMENTS, INDUSTRIES
from scheduler import (
    init_db as init_scheduler_db,
    schedule_post, list_posts, get_post, cancel_post, update_post, process_due_posts,
)
from news import fetch_all_news, extract_topics, generate_from_news_topic
from auth import (
    init_auth_db,
    create_user,
    authenticate_user,
    get_current_user,
    require_rate_limit,
    create_api_key,
    list_api_keys,
    revoke_api_key,
    update_user_profile,
    update_user_linkedin,
    update_persona_profile,
    save_user_posts,
    get_user_posts,
)
from linkedin import (
    get_auth_url,
    exchange_code,
    get_profile as get_linkedin_profile,
    publish_post as linkedin_publish,
    is_token_valid,
)


# ──────────────────────────────────────────────
# Background scheduler
# ──────────────────────────────────────────────

async def scheduler_loop():
    while True:
        try:
            await process_due_posts()
        except Exception as e:
            print(f"[SCHEDULER] Error: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_scheduler_db()
    init_auth_db()
    task = asyncio.create_task(scheduler_loop())
    print("[LINKEDCRAFT] Server started. Scheduler running.")
    yield
    task.cancel()


app = FastAPI(
    title="LinkedCraft API",
    description="AI LinkedIn post generator with auth, voice cloning, scheduling, news topics, and LinkedIn OAuth publishing.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# engine = LinkedCraftEngine(api_key=settings.ANTHROPIC_API_KEY, model=settings.MODEL)
engine = LinkedCraftEngine(provider=settings.PROVIDER, model=None)  # model is determined by provider in engine.py


# ══════════════════════════════════════════════
# AUTH ENDPOINTS (public)
# ══════════════════════════════════════════════


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (min 8 chars)")
    name: str = Field("", description="Display name")


class LoginRequest(BaseModel):
    email: str
    password: str


class ApiKeyRequest(BaseModel):
    name: str = Field("Default", description="Friendly name for this API key")


@app.post("/auth/register", tags=["Auth"])
async def register(req: RegisterRequest):
    """
    Create a new LinkedCraft account. Returns a JWT token.

    All new accounts start on the 'free' tier (10 requests/hour).
    """
    try:
        result = create_user(email=req.email, password=req.password, name=req.name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.post("/auth/login", tags=["Auth"])
async def login(req: LoginRequest):
    """
    Login with email/password. Returns a JWT token valid for 72 hours.

    Use the token as: Authorization: Bearer <token>
    """
    result = authenticate_user(email=req.email, password=req.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return result


@app.get("/auth/me", tags=["Auth"])
async def get_me(user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    persona = None
    if user.get("persona_profile"):
        try:
            persona = json.loads(user["persona_profile"])
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "tier": user["tier"],
        "has_linkedin": bool(user.get("linkedin_access_token")),
        "has_voice_profile": bool(user.get("voice_profile")),
        "industry": user.get("industry"),
        "audience_segments": user.get("audience_segments"),
        "persona": persona,
    }


@app.post("/auth/api-keys", tags=["Auth"])
async def generate_api_key_endpoint(req: ApiKeyRequest, user: dict = Depends(get_current_user)):
    """
    Generate a new API key for programmatic access.

    Use it as: X-Api-Key: lc_xxxxxxxxxxxx
    The key is shown only once — store it securely.
    """
    result = create_api_key(user_id=user["user_id"], name=req.name)
    return result


@app.get("/auth/api-keys", tags=["Auth"])
async def get_api_keys(user: dict = Depends(get_current_user)):
    """List all your API keys (masked)."""
    return list_api_keys(user_id=user["user_id"])


@app.delete("/auth/api-keys/{key_prefix}", tags=["Auth"])
async def delete_api_key(key_prefix: str, user: dict = Depends(get_current_user)):
    """Revoke an API key by its prefix (first 7 characters)."""
    success = revoke_api_key(user_id=user["user_id"], key_prefix=key_prefix)
    if not success:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"status": "revoked", "key_prefix": key_prefix}


# ══════════════════════════════════════════════
# LINKEDIN OAUTH ENDPOINTS
# ══════════════════════════════════════════════

@app.get("/linkedin/auth", tags=["LinkedIn"])
async def linkedin_auth(user: dict = Depends(get_current_user)):
    """
    Start the LinkedIn OAuth flow. Redirects to LinkedIn's consent screen.
    """
    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(
            status_code=501,
            detail="LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env",
        )
    url = get_auth_url(state=user["user_id"])
    return RedirectResponse(url=url)


@app.get("/linkedin/callback", tags=["LinkedIn"])
async def linkedin_callback(code: str = Query(...), state: str = Query(...)):
    """
    LinkedIn OAuth callback. Exchanges auth code for access token.
    Called automatically by LinkedIn after user approves.
    """
    try:
        token_data = await exchange_code(code)
        profile = await get_linkedin_profile(token_data["access_token"])

        update_user_linkedin(
            user_id=state,
            access_token=token_data["access_token"],
            person_id=profile["person_id"],
            expires_at=token_data["expires_at"],
        )

        return {
            "status": "connected",
            "linkedin_name": profile["name"],
            "token_expires_at": token_data["expires_at"],
            "message": "LinkedIn connected! You can now publish posts via POST /linkedin/publish",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LinkedIn OAuth failed: {str(e)}")


class LinkedInPublishRequest(BaseModel):
    content: str = Field(..., min_length=10, max_length=3000, description="Post content to publish")


@app.post("/linkedin/publish", tags=["LinkedIn"])
async def linkedin_publish_post(req: LinkedInPublishRequest, user: dict = Depends(require_rate_limit)):
    """
    Publish a post directly to the user's LinkedIn feed.
    Requires a connected LinkedIn account (via GET /linkedin/auth).
    """
    access_token = user.get("linkedin_access_token")
    person_id = user.get("linkedin_person_id")

    if not access_token or not person_id:
        raise HTTPException(
            status_code=403,
            detail="No LinkedIn account connected. Start OAuth at GET /linkedin/auth",
        )

    try:
        result = await linkedin_publish(access_token=access_token, person_id=person_id, content=req.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LinkedIn publish failed: {str(e)}")


@app.get("/linkedin/status", tags=["LinkedIn"])
async def linkedin_status(user: dict = Depends(get_current_user)):
    """Check if the user has a valid LinkedIn connection."""
    has_token = bool(user.get("linkedin_access_token"))
    return {
        "connected": has_token,
        "person_id": user.get("linkedin_person_id") if has_token else None,
        "setup_url": "/linkedin/auth" if not has_token else None,
    }


class SyncPostsRequest(BaseModel):
    posts: list[str] = Field(..., description="LinkedIn post texts collected by the Chrome extension")


@app.post("/linkedin/sync-posts", tags=["LinkedIn"])
async def sync_linkedin_posts(req: SyncPostsRequest, user: dict = Depends(require_rate_limit)):
    """
    Accept posts synced from the Chrome extension.
    1. Stores raw posts in the DB.
    2. Runs a single AI call to extract voice profile + full persona.
    3. Saves both to the user's account.
    """
    posts = [p.strip() for p in req.posts if p and p.strip()]
    if not posts:
        raise HTTPException(status_code=400, detail="No valid posts provided")

    capped = posts[:50]
    sample_posts = "\n\n---\n\n".join(capped)

    try:
        # Store raw posts
        save_user_posts(user_id=user["user_id"], posts=capped)

        # One AI call → voice profile + full persona
        result = await engine.analyze_full_profile(sample_posts=sample_posts)

        # Persist
        update_user_profile(user_id=user["user_id"], voice_profile=result["voice_profile"])
        update_persona_profile(user_id=user["user_id"], persona_profile=json.dumps(result["persona"]))

        return {
            "status": "synced",
            "posts_analyzed": len(capped),
            "voice_profile": result["voice_profile"],
            "persona": result["persona"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/linkedin/profile", tags=["LinkedIn"])
async def get_linkedin_profile_data(user: dict = Depends(get_current_user)):
    """Return the user's stored persona profile and post count."""
    persona = None
    if user.get("persona_profile"):
        try:
            persona = json.loads(user["persona_profile"])
        except (json.JSONDecodeError, TypeError):
            pass
    posts = get_user_posts(user_id=user["user_id"])
    return {
        "persona": persona,
        "posts_count": len(posts),
        "has_voice_profile": bool(user.get("voice_profile")),
    }


# ══════════════════════════════════════════════
# GENERATION ENDPOINTS (protected + rate limited)
# ══════════════════════════════════════════════

@app.post("/generate", response_model=GenerateResponse, tags=["Generation"])
async def generate_posts(req: GenerateRequest, user: dict = Depends(require_rate_limit)):
    """
    Generate LinkedIn posts from a topic/idea. Rate limited by tier.
    User's saved voice_profile, industry, and audience are auto-applied
    if not explicitly provided.
    """
    try:
        voice = req.voice_profile or user.get("voice_profile")
        industry = req.industry or user.get("industry")
        audiences = req.audience_segments
        if not audiences and user.get("audience_segments"):
            try:
                audiences = json.loads(user["audience_segments"])
            except (json.JSONDecodeError, TypeError):
                audiences = []

        persona = None
        if user.get("persona_profile"):
            try:
                persona = json.loads(user["persona_profile"])
            except (json.JSONDecodeError, TypeError):
                pass

        result = await engine.generate(
            topic=req.topic,
            framework=req.framework,
            tone=req.tone,
            post_count=req.post_count,
            voice_profile=voice,
            audience_segments=audiences,
            industry=industry,
            persona=persona,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/repurpose", response_model=GenerateResponse, tags=["Generation"])
async def repurpose_content(req: RepurposeRequest, user: dict = Depends(require_rate_limit)):
    """Repurpose existing content into LinkedIn posts. Rate limited."""
    try:
        voice = req.voice_profile or user.get("voice_profile")
        industry = req.industry or user.get("industry")

        persona = None
        if user.get("persona_profile"):
            try:
                persona = json.loads(user["persona_profile"])
            except (json.JSONDecodeError, TypeError):
                pass

        result = await engine.repurpose(
            content=req.content,
            source_type=req.source_type,
            focus_angle=req.focus_angle,
            framework=req.framework,
            tone=req.tone,
            post_count=req.post_count,
            voice_profile=voice,
            audience_segments=req.audience_segments,
            industry=industry,
            persona=persona,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════
# VOICE CLONING (protected)
# ══════════════════════════════════════════════

@app.post("/voice/analyze", response_model=VoiceProfileResponse, tags=["Voice Cloning"])
async def analyze_voice(req: VoiceAnalyzeRequest, user: dict = Depends(require_rate_limit)):
    """
    Analyze writing samples and save voice profile to user's account.
    Future /generate and /repurpose calls auto-apply this voice.
    """
    try:
        result = await engine.analyze_voice(sample_posts=req.sample_posts)
        update_user_profile(user_id=user["user_id"], voice_profile=result["voice_profile"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice/test", response_model=GenerateResponse, tags=["Voice Cloning"])
async def test_voice(req: VoiceTestRequest, user: dict = Depends(require_rate_limit)):
    """Generate a test post using a voice profile."""
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


# ══════════════════════════════════════════════
# ANALYTICS (protected)
# ══════════════════════════════════════════════

@app.post("/analytics/score", response_model=ScoreResponse, tags=["Analytics"])
async def score_post_endpoint(req: ScoreRequest, user: dict = Depends(require_rate_limit)):
    """Score an existing LinkedIn post for quality and engagement potential."""
    try:
        result = await engine.score_post(content=req.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════
# SCHEDULING (protected)
# ══════════════════════════════════════════════

@app.post("/schedule", response_model=ScheduledPostResponse, tags=["Scheduling"])
async def create_scheduled_post(req: SchedulePostRequest, user: dict = Depends(require_rate_limit)):
    """Schedule a post for future publishing."""
    try:
        scheduled_dt = datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO 8601.")

    if scheduled_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    result = schedule_post(content=req.content, scheduled_at=scheduled_dt, metadata=req.metadata)
    return result


@app.get("/schedule", response_model=list[ScheduledPostResponse], tags=["Scheduling"])
async def list_scheduled_posts(
    status: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
):
    """List all scheduled posts, optionally filtered by status."""
    valid = {"scheduled", "published", "failed", "cancelled"}
    if status and status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid)}")
    return list_posts(status=status)


@app.get("/schedule/{post_id}", response_model=ScheduledPostResponse, tags=["Scheduling"])
async def get_scheduled_post(post_id: str, user: dict = Depends(get_current_user)):
    post = get_post(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Scheduled post not found")
    return post


@app.put("/schedule/{post_id}", response_model=ScheduledPostResponse, tags=["Scheduling"])
async def update_scheduled_post(post_id: str, req: UpdateScheduledPostRequest, user: dict = Depends(get_current_user)):
    scheduled_dt = None
    if req.scheduled_at:
        try:
            scheduled_dt = datetime.fromisoformat(req.scheduled_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid datetime format")
        if scheduled_dt <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    result = update_post(post_id, content=req.content, scheduled_at=scheduled_dt)
    if not result:
        raise HTTPException(status_code=404, detail="Post not found or not in 'scheduled' status")
    return result


@app.delete("/schedule/{post_id}", response_model=ScheduledPostResponse, tags=["Scheduling"])
async def cancel_scheduled_post(post_id: str, user: dict = Depends(get_current_user)):
    result = cancel_post(post_id)
    if not result:
        raise HTTPException(status_code=404, detail="Post not found or not in 'scheduled' status")
    return result


# ══════════════════════════════════════════════
# AI NEWS (protected)
# ══════════════════════════════════════════════

@app.get("/news/topics", response_model=NewsTopicsResponse, tags=["AI News"])
async def get_news_topics(user: dict = Depends(require_rate_limit)):
    """Fetch trending AI topics from the latest news."""
    try:
        articles = await fetch_all_news(max_per_feed=8)
        if not articles:
            raise HTTPException(status_code=502, detail="Could not fetch news. Check network.")

        topics = await extract_topics(articles, engine)
        return {
            "topics": topics,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "article_count": len(articles),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/news/generate", response_model=GenerateResponse, tags=["AI News"])
async def generate_from_news(req: NewsGenerateRequest, user: dict = Depends(require_rate_limit)):
    """Generate a LinkedIn post from a selected news topic."""
    try:
        topic_dict = {
            "title": req.topic_title,
            "angle": req.topic_angle,
            "source_headline": req.source_headline,
            "suggested_framework": req.framework or "contrarian-take",
        }
        voice = req.voice_profile or user.get("voice_profile")

        result = await generate_from_news_topic(
            topic=topic_dict,
            engine=engine,
            tone=req.tone,
            framework=req.framework,
            voice_profile=voice,
            audience_segments=req.audience_segments,
            industry=req.industry,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════
# REFERENCE DATA (public — no auth)
# ══════════════════════════════════════════════

@app.get("/frameworks", response_model=list[Framework], tags=["Reference Data"])
async def list_frameworks():
    return FRAMEWORKS

@app.get("/tones", response_model=list[Tone], tags=["Reference Data"])
async def list_tones():
    return TONES

@app.get("/audiences", response_model=list[AudienceSegment], tags=["Reference Data"])
async def list_audiences():
    return AUDIENCE_SEGMENTS

@app.get("/industries", response_model=list[str], tags=["Reference Data"])
async def list_industries():
    return INDUSTRIES

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "version": "3.0.0", "engine": "LinkedCraft"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
