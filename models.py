"""
Pydantic models for request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ──────────────────────────────────────────────
# Request models
# ──────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=500, description="Topic or idea for the post")
    framework: Optional[str] = Field(None, description="Framework ID (e.g., 'hook-story-offer', 'contrarian-take')")
    tone: str = Field("conversational", description="Tone ID (e.g., 'professional', 'bold', 'witty')")
    post_count: int = Field(1, ge=1, le=5, description="Number of post variations to generate")
    voice_profile: Optional[str] = Field(None, description="Voice profile string from /voice/analyze")
    audience_segments: list[str] = Field(default_factory=list, description="Target audience IDs")
    industry: Optional[str] = Field(None, description="Industry context")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "topic": "Why most startups fail at hiring their first 10 employees",
                    "framework": "hook-story-offer",
                    "tone": "conversational",
                    "post_count": 3,
                    "audience_segments": ["founders", "recruiters"],
                    "industry": "SaaS / Tech",
                }
            ]
        }
    }


class RepurposeRequest(BaseModel):
    content: str = Field(..., min_length=50, max_length=10000, description="Source content to repurpose")
    source_type: str = Field("blog", description="Type: blog, podcast, tweet, presentation, email, notes")
    focus_angle: Optional[str] = Field(None, description="Specific angle to focus on")
    framework: Optional[str] = Field(None, description="Framework ID")
    tone: str = Field("conversational", description="Tone ID")
    post_count: int = Field(3, ge=1, le=5, description="Number of posts to extract")
    voice_profile: Optional[str] = Field(None, description="Voice profile string")
    audience_segments: list[str] = Field(default_factory=list, description="Target audience IDs")
    industry: Optional[str] = Field(None, description="Industry context")


class VoiceAnalyzeRequest(BaseModel):
    sample_posts: str = Field(
        ..., min_length=100, max_length=15000,
        description="3-5 sample LinkedIn posts separated by blank lines"
    )


class VoiceTestRequest(BaseModel):
    voice_profile: str = Field(..., description="Voice profile from /voice/analyze")
    topic: Optional[str] = Field(None, description="Optional topic for the test post")


class ScoreRequest(BaseModel):
    content: str = Field(..., min_length=20, max_length=5000, description="LinkedIn post content to score")


# ──────────────────────────────────────────────
# Response models
# ──────────────────────────────────────────────

class PostResult(BaseModel):
    content: str = Field(..., description="The generated LinkedIn post")
    hook_score: int = Field(..., ge=1, le=10, description="Hook strength rating 1-10")
    engagement_prediction: str = Field(..., description="Predicted engagement: low, medium, high, viral")
    best_time: str = Field(..., description="Suggested best posting time")
    tip: str = Field(..., description="One specific improvement suggestion")


class GenerateResponse(BaseModel):
    posts: list[PostResult]
    framework_used: Optional[str] = None
    tone_used: Optional[str] = None
    voice_applied: bool = False


class VoiceProfileResponse(BaseModel):
    voice_profile: str = Field(..., description="Detailed voice profile description")
    key_traits: list[str] = Field(..., description="Key writing traits identified")
    avoid: list[str] = Field(..., description="Things this voice would never do")


class ScoreResult(BaseModel):
    overall_score: int = Field(..., ge=1, le=100, description="Overall post quality score")
    hook_score: int = Field(..., ge=1, le=10, description="Hook strength")
    readability_score: int = Field(..., ge=1, le=10, description="Readability and formatting")
    engagement_score: int = Field(..., ge=1, le=10, description="Engagement potential")
    authenticity_score: int = Field(..., ge=1, le=10, description="How human/authentic it sounds")
    strengths: list[str] = Field(..., description="What the post does well")
    improvements: list[str] = Field(..., description="Specific improvement suggestions")
    rewritten_hook: str = Field(..., description="A stronger alternative hook")


class ScoreResponse(BaseModel):
    score: ScoreResult


# ──────────────────────────────────────────────
# Reference data models
# ──────────────────────────────────────────────

class Framework(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    structure: str
    example: str


class Tone(BaseModel):
    id: str
    name: str
    emoji: str


class AudienceSegment(BaseModel):
    id: str
    label: str
    icon: str
