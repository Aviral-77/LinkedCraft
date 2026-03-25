# LinkedCraft

AI-powered LinkedIn post generator with voice cloning, persona analysis, and one-click scheduling.

---

## What it does

LinkedCraft learns your writing style from your LinkedIn posts, then generates new posts that genuinely sound like you — not like AI.

- **Voice sync** — Chrome extension scrapes your recent LinkedIn posts, AI extracts your writing DNA
- **Persona profile** — identifies your personality archetypes, interests, expertise, and content themes
- **Post generation** — creates posts using your voice + persona embedded in every prompt
- **Content repurposing** — turns blogs, podcasts, newsletters into LinkedIn posts
- **AI news** — trending topics → ready-to-post content
- **Post scoring** — rates hook strength, readability, engagement, authenticity
- **Scheduling** — queue posts for future publishing
- **LinkedIn publishing** — publish directly from the dashboard via OAuth

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, plain CSS-in-JS |
| Backend | FastAPI, Python 3.11+, SQLite |
| AI | Gemini 2.5 Flash (default) or Claude 3.5 Sonnet |
| Auth | JWT + API keys, bcrypt-style password hashing |
| Extension | Chrome MV3, vanilla JS |

---

## Project structure

```
LinkedCraft/
├── app/                        # FastAPI backend
│   ├── main.py                 # All API routes
│   ├── engine.py               # AI prompt engineering + API calls
│   ├── auth.py                 # JWT auth, API keys, rate limiting
│   ├── linkedin.py             # LinkedIn OAuth + publishing
│   ├── scheduler.py            # Post scheduling loop
│   ├── news.py                 # RSS feed → AI topic extraction
│   ├── models.py               # Pydantic request/response schemas
│   ├── data.py                 # Frameworks, tones, audiences reference data
│   ├── config.py               # Settings from .env
│   └── requirements.txt
│
├── frontend/
│   └── linkedcraft-ui/         # Vite + React SPA
│       └── src/App.jsx         # Full dashboard (single component)
│
├── chrome-extension/           # Chrome Helper extension
│   ├── manifest.json           # MV3 manifest
│   ├── popup.html              # Extension popup UI
│   ├── popup.js                # Sync logic: scrape LinkedIn → POST to API
│   └── detect.js               # Content script: signals dashboard + passes JWT
│
└── README.md
```

---

## Setup

### 1. Backend

```bash
cd app

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env   # or create manually
```

**.env file:**
```env
# Required — get a free key at https://aistudio.google.com
GEMINI_API_KEY=your_gemini_key_here

# Optional — use Anthropic instead
# PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...

# Optional — for direct LinkedIn publishing from the dashboard
# Get credentials at https://www.linkedin.com/developers/apps
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Change in production
JWT_SECRET=change-me-to-a-long-random-string
```

```bash
# Start the server
python main.py
# → http://localhost:8000
# → API docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend/linkedcraft-ui

npm install
npm run dev
# → http://localhost:5173
```

### 3. Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Pin **LinkedCraft Helper** to your toolbar

The extension reads your JWT token automatically from the dashboard's `localStorage` — no API key required.

---

## How to use

### First time

1. Open `http://localhost:5173` → create an account
2. Go to **Source** tab → click **Install Extension** (if not already loaded)
3. Click the LinkedCraft Helper icon in your toolbar
4. Click **Sync My Posts** — the extension opens your LinkedIn activity page, collects posts, and sends them to the backend
5. Return to the dashboard → click **Refresh Profile**

Your **LinkedIn DNA** card now shows:
- Personality archetypes (Visionary, Builder, Educator…)
- Core interests and expertise areas
- Content themes you write about
- Your audience fit

### Generating posts

Go to **Generate** → type a topic → click Generate.

Your voice, persona, interests, and expertise are automatically injected into every AI prompt. Posts come back with hook scores, engagement predictions, and posting time suggestions.

**Advanced options** (hidden by default):
- Framework — Hook→Story→Offer, Contrarian Take, Listicle, AIDA, PAS, etc.
- Audience targeting
- Number of variations (1–5)

### Publishing

Each generated post card has:
- **Copy** — copies to clipboard
- **Publish** — posts directly to LinkedIn (requires OAuth connection in Settings)
- **Schedule** — picks a future date/time

---

## API reference

Base URL: `http://localhost:8000`
Auth: `Authorization: Bearer <token>` or `X-Api-Key: lc_...`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login → JWT token |
| GET | `/auth/me` | Current user + persona |
| POST | `/auth/api-keys` | Generate API key |
| POST | `/generate` | Generate posts from topic |
| POST | `/repurpose` | Repurpose content into posts |
| POST | `/voice/analyze` | Analyze voice from pasted text |
| POST | `/linkedin/sync-posts` | Accept posts from Chrome extension |
| GET | `/linkedin/profile` | Get stored persona + post count |
| GET | `/linkedin/auth` | Start LinkedIn OAuth flow |
| POST | `/linkedin/publish` | Publish post to LinkedIn feed |
| GET | `/news/topics` | Fetch trending AI topics |
| POST | `/news/generate` | Generate post from news topic |
| POST | `/analytics/score` | Score a post |
| POST | `/schedule` | Schedule a post |
| GET | `/schedule` | List scheduled posts |
| GET | `/health` | Health check |

Full interactive docs: `http://localhost:8000/docs`

---

## Rate limits

| Tier | Requests/hour |
|---|---|
| Free | 10 |
| Pro | 100 |
| Enterprise | 1,000 |

---

## How the voice sync works

```
Chrome extension
    → scrapes linkedin.com/in/me/recent-activity/all/
    → collects last 30–50 post texts
    → POST /linkedin/sync-posts

Backend
    → saves raw posts to linkedin_posts table (per user)
    → single AI call: analyze_full_profile()
        extracts → voice_profile (writing style description)
                 → personality archetypes
                 → interests, expertise, content themes
                 → audience fit, writing traits, things to avoid
    → saves voice_profile to users.voice_profile
    → saves persona JSON to users.persona_profile

Every /generate and /repurpose call
    → loads voice_profile + persona from DB
    → injects both into the AI system prompt
    → AI writes as this specific person
```

---

## License

MIT
