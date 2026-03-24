"""
Reference data — frameworks, tones, audience segments, industries.
"""

FRAMEWORKS = [
    {
        "id": "hook-story-offer",
        "name": "Hook → Story → Offer",
        "icon": "🎣",
        "description": "Grab attention, tell a story, make your point",
        "structure": "Start with a bold hook line, then share a personal story or anecdote, and end with a clear takeaway or call-to-action.",
        "example": "I got fired on a Monday.\n\nBut here's what nobody tells you about losing your job...",
    },
    {
        "id": "contrarian-take",
        "name": "Contrarian Take",
        "icon": "🔥",
        "description": "Challenge conventional wisdom",
        "structure": "Open with an unpopular opinion or myth-busting statement, provide evidence or reasoning, then reframe the topic.",
        "example": "Unpopular opinion: Networking events are a waste of time.\n\nHere's what actually builds relationships...",
    },
    {
        "id": "listicle",
        "name": "Numbered Listicle",
        "icon": "📋",
        "description": "Actionable tips in a scannable format",
        "structure": "Present a numbered list of tips, lessons, or insights with brief explanations for each.",
        "example": "7 things I learned after 10 years in sales:\n\n1. Listen more than you talk\n2. ...",
    },
    {
        "id": "before-after",
        "name": "Before → After → Bridge",
        "icon": "🌉",
        "description": "Show transformation",
        "structure": "Describe the 'before' state (the problem), the 'after' state (the result), and the bridge (how to get there).",
        "example": "2 years ago: struggling to get 10 likes on a post.\nToday: 50K+ followers and inbound leads daily.\n\nHere's the bridge...",
    },
    {
        "id": "aida",
        "name": "AIDA",
        "icon": "🎯",
        "description": "Attention → Interest → Desire → Action",
        "structure": "Grab attention with a bold opener, build interest with details, create desire with benefits, and end with a clear call to action.",
        "example": "Stop scrolling. This could change how you hire.\n\nWe tested a new interview format...",
    },
    {
        "id": "pas",
        "name": "Problem → Agitate → Solve",
        "icon": "💡",
        "description": "Identify pain, amplify it, then provide the solution",
        "structure": "State a common problem your audience faces, agitate by showing the consequences, then present your solution.",
        "example": "Most founders burn out before year 3.\n\nThe pressure compounds. Revenue stalls. Self-doubt creeps in.\n\nBut there's a framework that changes everything...",
    },
    {
        "id": "carousel-script",
        "name": "Carousel Script",
        "icon": "🎠",
        "description": "Multi-slide carousel content",
        "structure": "Create a hook slide, 5-8 content slides with one key point each, and a closing CTA slide. Each slide should be concise and visually focused.",
        "example": "Slide 1: The 5 pricing mistakes killing your SaaS\nSlide 2: Mistake #1 — Pricing based on cost, not value\n...",
    },
    {
        "id": "storytelling",
        "name": "Micro Story",
        "icon": "📖",
        "description": "A short narrative with a powerful lesson",
        "structure": "Tell a brief, vivid story with a clear beginning, tension, and resolution that ties back to a professional insight.",
        "example": "The best manager I ever had did something unexpected on my first day.\n\nShe said: 'I want you to disagree with me. Often.'\n\nHere's why that changed everything...",
    },
]

TONES = [
    {"id": "professional", "name": "Professional", "emoji": "👔"},
    {"id": "conversational", "name": "Conversational", "emoji": "💬"},
    {"id": "bold", "name": "Bold & Edgy", "emoji": "⚡"},
    {"id": "inspirational", "name": "Inspirational", "emoji": "✨"},
    {"id": "witty", "name": "Witty & Clever", "emoji": "😏"},
    {"id": "analytical", "name": "Data-Driven", "emoji": "📊"},
    {"id": "vulnerable", "name": "Vulnerable & Raw", "emoji": "💛"},
    {"id": "authoritative", "name": "Authoritative", "emoji": "🎓"},
]

AUDIENCE_SEGMENTS = [
    {"id": "founders", "label": "Founders & CEOs", "icon": "🚀"},
    {"id": "marketers", "label": "Marketers", "icon": "📣"},
    {"id": "developers", "label": "Developers", "icon": "💻"},
    {"id": "recruiters", "label": "HR & Recruiters", "icon": "🤝"},
    {"id": "sales", "label": "Sales Professionals", "icon": "💰"},
    {"id": "jobseekers", "label": "Job Seekers", "icon": "🔍"},
    {"id": "executives", "label": "C-Suite Executives", "icon": "👑"},
    {"id": "creators", "label": "Content Creators", "icon": "🎨"},
]

INDUSTRIES = [
    "SaaS / Tech",
    "Finance",
    "Marketing",
    "HR / People",
    "Sales",
    "Healthcare",
    "Education",
    "Real Estate",
    "Consulting",
    "E-commerce",
    "AI / ML",
    "Product Management",
    "Design / UX",
    "Legal",
    "Other",
]
