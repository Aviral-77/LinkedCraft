# LinkedCraft — AI LinkedIn Post Generator Engine

A production-ready FastAPI backend that powers LinkedIn post generation with 4 core USPs:

- **Voice Cloning** — Analyze writing samples to replicate a user's unique style
- **Content Repurposing** — Transform blogs, podcasts, newsletters into LinkedIn posts
- **Audience Targeting** — Tailor posts to specific professional segments and industries
- **Framework Library** — 8 proven post structures (Hook→Story→Offer, AIDA, PAS, etc.)

---

## Quick Start

```bash
# 1. Clone and navigate
cd linkedcraft

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env and add your Anthropic API key

# 5. Run the server
cd app
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs** (Swagger UI)

---

## API Reference

### POST `/generate` — Generate Posts

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Why most startups fail at hiring their first 10 employees",
    "framework": "hook-story-offer",
    "tone": "conversational",
    "post_count": 3,
    "audience_segments": ["founders", "recruiters"],
    "industry": "SaaS / Tech"
  }'
```

**Response:**
```json
{
  "posts": [
    {
      "content": "I hired 10 people in 6 months.\n\n8 of them were wrong.\n\nHere's what I wish someone told me...",
      "hook_score": 9,
      "engagement_prediction": "high",
      "best_time": "Tue 9am",
      "tip": "Add a specific metric in the story to increase credibility"
    }
  ],
  "framework_used": "hook-story-offer",
  "tone_used": "conversational",
  "voice_applied": false
}
```

### POST `/repurpose` — Repurpose Content

```bash
curl -X POST http://localhost:8000/repurpose \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your blog post or transcript text here...",
    "source_type": "blog",
    "focus_angle": "Focus on the hiring insights",
    "post_count": 3,
    "tone": "bold"
  }'
```

### POST `/voice/analyze` — Clone a Writing Voice

```bash
curl -X POST http://localhost:8000/voice/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "sample_posts": "Post 1 text here...\n\nPost 2 text here...\n\nPost 3 text here..."
  }'
```

**Response:**
```json
{
  "voice_profile": "Writes in short, punchy sentences. Favors storytelling...",
  "key_traits": ["uses rhetorical questions", "short paragraphs", "personal anecdotes"],
  "avoid": ["hashtags", "corporate jargon", "emoji overuse"]
}
```

Then pass the `voice_profile` string to `/generate` or `/repurpose`:

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Remote work productivity",
    "voice_profile": "Writes in short, punchy sentences. Favors storytelling...",
    "tone": "conversational"
  }'
```

### POST `/analytics/score` — Score a Post

```bash
curl -X POST http://localhost:8000/analytics/score \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your existing LinkedIn post here..."
  }'
```

**Response:**
```json
{
  "score": {
    "overall_score": 72,
    "hook_score": 8,
    "readability_score": 7,
    "engagement_score": 8,
    "authenticity_score": 6,
    "strengths": ["Strong opening hook", "Good use of storytelling"],
    "improvements": ["Add a question at the end to drive comments"],
    "rewritten_hook": "A stronger alternative opening line"
  }
}
```

### GET endpoints — Reference Data

| Endpoint        | Returns                                  |
|-----------------|------------------------------------------|
| `/frameworks`   | All 8 post frameworks with examples      |
| `/tones`        | All 8 writing tones                      |
| `/audiences`    | All 8 audience segments                  |
| `/industries`   | All 15 supported industries              |
| `/health`       | API health check                         |

---

## Project Structure

```
linkedcraft/
├── app/
│   ├── main.py          # FastAPI app, routes, endpoint definitions
│   ├── engine.py        # Core AI engine (prompts + API calls)
│   ├── models.py        # Pydantic request/response schemas
│   ├── data.py          # Frameworks, tones, audiences, industries
│   └── config.py        # Settings from environment variables
├── requirements.txt
├── .env.example
└── README.md
```

---

## Frameworks Available

| ID               | Name                   | Best For                        |
|------------------|------------------------|---------------------------------|
| hook-story-offer | Hook → Story → Offer   | Personal stories, lessons       |
| contrarian-take  | Contrarian Take        | Hot takes, myth-busting         |
| listicle         | Numbered Listicle      | Tips, actionable advice         |
| before-after     | Before → After → Bridge| Transformation stories          |
| aida             | AIDA                   | Product launches, announcements |
| pas              | Problem → Agitate → Solve | Pain point content           |
| carousel-script  | Carousel Script        | Multi-slide visual content      |
| storytelling     | Micro Story            | Narrative-driven posts          |

---

## Typical Integration Flow

```
1. User signs up → call POST /voice/analyze with their sample posts
2. Store the returned voice_profile in your database
3. For each generation → call POST /generate with:
   - topic + framework + tone (user selects)
   - voice_profile (from step 2)
   - audience_segments + industry (from user profile)
4. Optionally score drafts → call POST /analytics/score
5. User edits and publishes via LinkedIn API
```

---

## License

MIT
