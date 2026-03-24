import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:8000";

// ─── Design Tokens ───
const T = {
  bg: "#08090d",
  surface: "#111318",
  surfaceHover: "#181b22",
  border: "#1f222b",
  borderActive: "#d4fc79",
  accent: "#d4fc79",
  accentDim: "rgba(212,252,121,0.08)",
  accentMid: "rgba(212,252,121,0.15)",
  text: "#e8eaf0",
  textMid: "#9199a8",
  textDim: "#545d6e",
  danger: "#ff6b6b",
  dangerDim: "rgba(255,107,107,0.1)",
  success: "#6bffb8",
  warn: "#ffb86b",
  radius: "12px",
  radiusSm: "8px",
  font: "'Satoshi', 'DM Sans', sans-serif",
  mono: "'JetBrains Mono', 'DM Mono', monospace",
};

const FRAMEWORKS = [
  { id: "hook-story-offer", name: "Hook → Story → Offer", icon: "🎣" },
  { id: "contrarian-take", name: "Contrarian Take", icon: "🔥" },
  { id: "listicle", name: "Numbered Listicle", icon: "📋" },
  { id: "before-after", name: "Before → After → Bridge", icon: "🌉" },
  { id: "aida", name: "AIDA", icon: "🎯" },
  { id: "pas", name: "Problem → Agitate → Solve", icon: "💡" },
  { id: "carousel-script", name: "Carousel Script", icon: "🎠" },
  { id: "storytelling", name: "Micro Story", icon: "📖" },
];

const TONES = [
  { id: "professional", name: "Professional", e: "👔" },
  { id: "conversational", name: "Conversational", e: "💬" },
  { id: "bold", name: "Bold & Edgy", e: "⚡" },
  { id: "inspirational", name: "Inspirational", e: "✨" },
  { id: "witty", name: "Witty & Clever", e: "😏" },
  { id: "analytical", name: "Data-Driven", e: "📊" },
  { id: "vulnerable", name: "Vulnerable", e: "💛" },
  { id: "authoritative", name: "Authoritative", e: "🎓" },
];

const AUDIENCES = [
  { id: "founders", label: "Founders", icon: "🚀" },
  { id: "marketers", label: "Marketers", icon: "📣" },
  { id: "developers", label: "Developers", icon: "💻" },
  { id: "recruiters", label: "HR & Recruiters", icon: "🤝" },
  { id: "sales", label: "Sales", icon: "💰" },
  { id: "jobseekers", label: "Job Seekers", icon: "🔍" },
  { id: "executives", label: "C-Suite", icon: "👑" },
  { id: "creators", label: "Creators", icon: "🎨" },
];

const SOURCE_TYPES = [
  { id: "blog", label: "Blog Post", icon: "📝" },
  { id: "podcast", label: "Podcast", icon: "🎙️" },
  { id: "tweet", label: "Tweet", icon: "🐦" },
  { id: "presentation", label: "Talk", icon: "🎤" },
  { id: "email", label: "Newsletter", icon: "📧" },
  { id: "notes", label: "Notes", icon: "📒" },
];

// ─── API Helper ───
async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
  return data;
}

// ─── Shared Styles ───
const btnBase = {
  border: "none",
  cursor: "pointer",
  fontFamily: T.font,
  fontWeight: 600,
  transition: "all 0.2s",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const btnPrimary = {
  ...btnBase,
  background: `linear-gradient(135deg, ${T.accent}, #b8e86e)`,
  color: T.bg,
  padding: "12px 24px",
  borderRadius: T.radiusSm,
  fontSize: "13.5px",
  letterSpacing: "0.02em",
};

const btnSecondary = {
  ...btnBase,
  background: T.surface,
  color: T.textMid,
  border: `1px solid ${T.border}`,
  padding: "10px 18px",
  borderRadius: T.radiusSm,
  fontSize: "13px",
};

const inputBase = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: T.radiusSm,
  border: `1.5px solid ${T.border}`,
  background: T.bg,
  color: T.text,
  fontSize: "13.5px",
  fontFamily: T.font,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

const labelStyle = {
  color: T.textDim,
  fontSize: "10.5px",
  fontWeight: 700,
  fontFamily: T.mono,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "8px",
  display: "block",
};

const card = {
  background: T.surface,
  borderRadius: T.radius,
  border: `1px solid ${T.border}`,
  padding: "20px",
};

// ─── Components ───

function Pill({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        padding: "6px 14px",
        borderRadius: "20px",
        fontSize: "12px",
        border: `1.5px solid ${selected ? T.borderActive : T.border}`,
        background: selected ? T.accentDim : "transparent",
        color: selected ? T.accent : T.textDim,
      }}
    >
      {children}
    </button>
  );
}

function Tag({ color = T.accent, children }) {
  return (
    <span
      style={{
        fontSize: "10.5px",
        fontFamily: T.mono,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: "6px",
        background: `${color}15`,
        color,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function Loader({ text = "Generating..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "50px 20px", gap: "16px" }}>
      <div style={{ display: "flex", gap: "5px" }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: T.accent,
              animation: `ldPulse 1s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ color: T.textDim, fontSize: "12.5px", fontFamily: T.font }}>{text}</span>
    </div>
  );
}

function PostCard({ post, idx, token }) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduled, setScheduled] = useState(false);

  const scoreColor = post.hook_score >= 8 ? T.accent : post.hook_score >= 6 ? T.warn : T.danger;
  const engMap = { viral: T.accent, high: T.success, medium: T.warn, low: T.danger };
  const engColor = engMap[post.engagement_prediction] || T.textDim;

  const handleCopy = () => {
    navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api("/linkedin/publish", { method: "POST", body: { content: post.content }, token });
      setPublished(true);
    } catch (e) {
      alert(`Publish failed: ${e.message}`);
    }
    setPublishing(false);
  };

  const handleSchedule = async () => {
    if (!scheduleTime) return;
    try {
      await api("/schedule", {
        method: "POST",
        body: { content: post.content, scheduled_at: new Date(scheduleTime).toISOString() },
        token,
      });
      setScheduled(true);
      setScheduleOpen(false);
    } catch (e) {
      alert(`Schedule failed: ${e.message}`);
    }
  };

  return (
    <div style={{ ...card, position: "relative", overflow: "hidden", marginBottom: "14px" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, ${scoreColor}, ${engColor})`,
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Tag color={T.accent}>POST {idx + 1}</Tag>
          <Tag color={scoreColor}>Hook {post.hook_score}/10</Tag>
          <Tag color={engColor}>{post.engagement_prediction}</Tag>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={handleCopy} style={{ ...btnSecondary, padding: "5px 12px", fontSize: "11px" }}>
            {copied ? "✓" : "Copy"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            style={{
              ...btnSecondary,
              padding: "5px 12px",
              fontSize: "11px",
              borderColor: published ? T.success : T.border,
              color: published ? T.success : T.textMid,
            }}
          >
            {published ? "✓ Published" : publishing ? "..." : "Publish"}
          </button>
          <button
            onClick={() => setScheduleOpen(!scheduleOpen)}
            style={{
              ...btnSecondary,
              padding: "5px 12px",
              fontSize: "11px",
              borderColor: scheduled ? T.accent : T.border,
              color: scheduled ? T.accent : T.textMid,
            }}
          >
            {scheduled ? "✓ Scheduled" : "Schedule"}
          </button>
        </div>
      </div>

      {/* Schedule inline */}
      {scheduleOpen && !scheduled && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "14px",
            padding: "10px 12px",
            background: T.bg,
            borderRadius: T.radiusSm,
            border: `1px solid ${T.border}`,
          }}
        >
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            style={{ ...inputBase, width: "auto", flex: 1 }}
          />
          <button onClick={handleSchedule} style={{ ...btnPrimary, padding: "8px 16px", fontSize: "12px" }}>
            Confirm
          </button>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          color: T.text,
          fontSize: "13.5px",
          lineHeight: 1.75,
          fontFamily: T.font,
          whiteSpace: "pre-wrap",
          padding: "16px",
          background: T.bg,
          borderRadius: T.radiusSm,
          border: `1px solid ${T.border}`,
          marginBottom: "12px",
        }}
      >
        {post.content}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: "11.5px",
          color: T.textDim,
          fontFamily: T.font,
        }}
      >
        <span>
          ⏰ Best time: <span style={{ color: T.accent }}>{post.best_time}</span>
        </span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>💡 {post.tip}</span>
      </div>
    </div>
  );
}

// ─── Main App ───

export default function LinkedCraftDashboard() {
  // Auth state
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Nav
  const [tab, setTab] = useState("generate");

  // Generate
  const [topic, setTopic] = useState("");
  const [framework, setFramework] = useState("");
  const [tone, setTone] = useState("conversational");
  const [postCount, setPostCount] = useState(1);
  const [audiences, setAudiences] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Repurpose
  const [rpContent, setRpContent] = useState("");
  const [rpType, setRpType] = useState("blog");
  const [rpAngle, setRpAngle] = useState("");
  const [rpCount, setRpCount] = useState(3);

  // Voice
  const [voiceSamples, setVoiceSamples] = useState("");
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);

  // News
  const [newsTopics, setNewsTopics] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedNewsTopic, setSelectedNewsTopic] = useState(null);

  // Schedule
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);

  // LinkedIn
  const [linkedinStatus, setLinkedinStatus] = useState(null);

  // Score
  const [scoreContent, setScoreContent] = useState("");
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const resultsRef = useRef(null);

  // ── Auth handlers ──
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const body =
        authMode === "register"
          ? { email: authEmail, password: authPass, name: authName }
          : { email: authEmail, password: authPass };
      const data = await api(path, { method: "POST", body });
      setToken(data.token);
      setUser(data);
    } catch (e) {
      setAuthError(e.message);
    }
    setAuthLoading(false);
  };

  // ── Fetch user profile + linkedin status on login ──
  useEffect(() => {
    if (!token) return;
    api("/auth/me", { token }).then(setUser).catch(() => {});
    api("/linkedin/status", { token }).then(setLinkedinStatus).catch(() => {});
  }, [token]);

  // ── Generate ──
  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setPosts([]);
    try {
      const data = await api("/generate", {
        method: "POST",
        token,
        body: { topic, framework: framework || undefined, tone, post_count: postCount, audience_segments: audiences },
      });
      setPosts(data.posts || []);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // ── Repurpose ──
  const handleRepurpose = async () => {
    setLoading(true);
    setError("");
    setPosts([]);
    try {
      const data = await api("/repurpose", {
        method: "POST",
        token,
        body: {
          content: rpContent,
          source_type: rpType,
          focus_angle: rpAngle || undefined,
          tone,
          post_count: rpCount,
          audience_segments: audiences,
        },
      });
      setPosts(data.posts || []);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // ── Voice ──
  const handleVoiceAnalyze = async () => {
    setVoiceLoading(true);
    setError("");
    try {
      const data = await api("/voice/analyze", { method: "POST", token, body: { sample_posts: voiceSamples } });
      setVoiceProfile(data);
    } catch (e) {
      setError(e.message);
    }
    setVoiceLoading(false);
  };

  // ── News ──
  const fetchNews = async () => {
    setNewsLoading(true);
    setError("");
    try {
      const data = await api("/news/topics", { token });
      setNewsTopics(data.topics || []);
    } catch (e) {
      setError(e.message);
    }
    setNewsLoading(false);
  };

  const generateFromNews = async (t) => {
    setLoading(true);
    setError("");
    setPosts([]);
    setSelectedNewsTopic(t);
    try {
      const data = await api("/news/generate", {
        method: "POST",
        token,
        body: {
          topic_title: t.title,
          topic_angle: t.angle,
          source_headline: t.source_headline,
          tone,
          audience_segments: audiences,
        },
      });
      setPosts(data.posts || []);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // ── Schedule list ──
  const fetchSchedule = async () => {
    setSchedLoading(true);
    try {
      const data = await api("/schedule", { token });
      setScheduledPosts(data);
    } catch (e) {
      setError(e.message);
    }
    setSchedLoading(false);
  };

  const cancelScheduled = async (id) => {
    try {
      await api(`/schedule/${id}`, { method: "DELETE", token });
      fetchSchedule();
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Score ──
  const handleScore = async () => {
    setScoreLoading(true);
    setScoreResult(null);
    try {
      const data = await api("/analytics/score", { method: "POST", token, body: { content: scoreContent } });
      setScoreResult(data.score);
    } catch (e) {
      setError(e.message);
    }
    setScoreLoading(false);
  };

  // ── Auth Screen ──
  if (!token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: T.font,
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @keyframes ldPulse { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1.2)} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          input:focus { border-color: ${T.accent} !important; }
        `}</style>

        <div
          style={{
            width: "380px",
            padding: "40px",
            background: T.surface,
            borderRadius: "20px",
            border: `1px solid ${T.border}`,
            animation: "fadeUp 0.4s ease",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${T.accent}, #8ed63a)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: 900,
                color: T.bg,
              }}
            >
              L
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: T.text, letterSpacing: "-0.02em" }}>LinkedCraft</div>
              <div style={{ fontSize: "10.5px", color: T.textDim, fontFamily: T.mono }}>AI Post Engine</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0", marginBottom: "28px", borderRadius: T.radiusSm, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => { setAuthMode(m); setAuthError(""); }}
                style={{
                  ...btnBase,
                  flex: 1,
                  padding: "10px",
                  fontSize: "12.5px",
                  background: authMode === m ? T.accentDim : "transparent",
                  color: authMode === m ? T.accent : T.textDim,
                  borderRadius: 0,
                  textTransform: "capitalize",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {authMode === "register" && (
              <input
                placeholder="Name"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                style={inputBase}
              />
            )}
            <input placeholder="Email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={inputBase} />
            <input
              placeholder="Password"
              type="password"
              value={authPass}
              onChange={(e) => setAuthPass(e.target.value)}
              style={inputBase}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />

            {authError && (
              <div style={{ color: T.danger, fontSize: "12px", padding: "8px 12px", background: T.dangerDim, borderRadius: T.radiusSm }}>
                {authError}
              </div>
            )}

            <button onClick={handleAuth} disabled={authLoading} style={{ ...btnPrimary, width: "100%", marginTop: "4px" }}>
              {authLoading ? "..." : authMode === "register" ? "Create Account" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const NAV = [
    { id: "generate", icon: "✍️", label: "Generate" },
    { id: "repurpose", icon: "♻️", label: "Repurpose" },
    { id: "news", icon: "📰", label: "AI News" },
    { id: "voice", icon: "🧬", label: "Voice Clone" },
    { id: "score", icon: "📊", label: "Score" },
    { id: "schedule", icon: "📅", label: "Schedule" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, display: "flex" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes ldPulse { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1.2)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input:focus, textarea:focus, select:focus { border-color: ${T.accent} !important; outline: none; }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>

      {/* ── Sidebar ── */}
      <div
        style={{
          width: "220px",
          minHeight: "100vh",
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px", marginBottom: "32px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9px",
              background: `linear-gradient(135deg, ${T.accent}, #8ed63a)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 900,
              color: T.bg,
            }}
          >
            L
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "14.5px", color: T.text, letterSpacing: "-0.02em" }}>LinkedCraft</div>
            <div style={{ fontSize: "9.5px", color: T.textDim, fontFamily: T.mono }}>v3.0</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setTab(n.id);
                if (n.id === "schedule") fetchSchedule();
              }}
              style={{
                ...btnBase,
                justifyContent: "flex-start",
                padding: "10px 14px",
                borderRadius: T.radiusSm,
                background: tab === n.id ? T.accentDim : "transparent",
                color: tab === n.id ? T.accent : T.textMid,
                fontSize: "13px",
                width: "100%",
              }}
            >
              <span style={{ fontSize: "15px", width: "22px" }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        {/* User pill */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: T.radiusSm,
            background: T.bg,
            border: `1px solid ${T.border}`,
            marginTop: "12px",
          }}
        >
          <div style={{ fontSize: "12.5px", color: T.text, fontWeight: 600, marginBottom: "4px" }}>{user?.name || user?.email}</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Tag color={T.accent}>{user?.tier || "free"}</Tag>
            {linkedinStatus?.connected && <Tag color={T.success}>LinkedIn</Tag>}
            {voiceProfile && <Tag color="#c084fc">Voice</Tag>}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, padding: "28px 36px", maxWidth: "900px", overflow: "auto" }}>
        {/* ── GENERATE TAB ── */}
        {tab === "generate" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>Generate Posts</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Create LinkedIn content from a topic or idea</p>
            </div>

            <div>
              <label style={labelStyle}>Topic</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Why most startups fail at hiring their first 10 employees..."
                rows={3}
                style={inputBase}
              />
            </div>

            <div>
              <label style={labelStyle}>Framework</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: "8px" }}>
                {FRAMEWORKS.map((fw) => (
                  <button
                    key={fw.id}
                    onClick={() => setFramework(framework === fw.id ? "" : fw.id)}
                    style={{
                      ...btnBase,
                      justifyContent: "flex-start",
                      padding: "11px 14px",
                      borderRadius: T.radiusSm,
                      border: `1.5px solid ${framework === fw.id ? T.borderActive : T.border}`,
                      background: framework === fw.id ? T.accentDim : T.surface,
                      color: framework === fw.id ? T.accent : T.textMid,
                      fontSize: "12px",
                      gap: "8px",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: "15px" }}>{fw.icon}</span>
                    {fw.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <div>
                <label style={labelStyle}>Tone</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {TONES.map((t) => (
                    <Pill key={t.id} selected={tone === t.id} onClick={() => setTone(t.id)}>
                      {t.e} {t.name}
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Audience</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {AUDIENCES.map((a) => (
                    <Pill
                      key={a.id}
                      selected={audiences.includes(a.id)}
                      onClick={() => setAudiences((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))}
                    >
                      {a.icon} {a.label}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Variations</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPostCount(n)}
                    style={{
                      ...btnBase,
                      width: "44px",
                      height: "40px",
                      borderRadius: T.radiusSm,
                      border: `1.5px solid ${postCount === n ? T.borderActive : T.border}`,
                      background: postCount === n ? T.accentDim : "transparent",
                      color: postCount === n ? T.accent : T.textDim,
                      fontFamily: T.mono,
                      fontSize: "14px",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ ...btnPrimary, width: "100%", opacity: !topic.trim() ? 0.4 : 1 }}>
              {loading ? "Generating..." : `Generate ${postCount > 1 ? postCount + " Posts" : "Post"}`}
            </button>
          </div>
        )}

        {/* ── REPURPOSE TAB ── */}
        {tab === "repurpose" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>Repurpose Content</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Turn blogs, podcasts & newsletters into LinkedIn posts</p>
            </div>

            <div>
              <label style={labelStyle}>Source Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {SOURCE_TYPES.map((s) => (
                  <Pill key={s.id} selected={rpType === s.id} onClick={() => setRpType(s.id)}>
                    {s.icon} {s.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Paste Your Content</label>
              <textarea value={rpContent} onChange={(e) => setRpContent(e.target.value)} placeholder="Paste your blog post, transcript, newsletter..." rows={10} style={inputBase} />
              <div style={{ textAlign: "right", marginTop: "4px", color: T.textDim, fontSize: "10.5px", fontFamily: T.mono }}>{rpContent.length.toLocaleString()} chars</div>
            </div>

            <div>
              <label style={labelStyle}>Focus Angle (optional)</label>
              <input value={rpAngle} onChange={(e) => setRpAngle(e.target.value)} placeholder="e.g., Focus on the hiring insights..." style={inputBase} />
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Posts to Generate</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[1, 3, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRpCount(n)}
                      style={{
                        ...btnBase,
                        flex: 1,
                        height: "40px",
                        borderRadius: T.radiusSm,
                        border: `1.5px solid ${rpCount === n ? T.borderActive : T.border}`,
                        background: rpCount === n ? T.accentDim : "transparent",
                        color: rpCount === n ? T.accent : T.textDim,
                        fontFamily: T.mono,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleRepurpose} disabled={loading || !rpContent.trim()} style={{ ...btnPrimary, width: "100%", opacity: !rpContent.trim() ? 0.4 : 1 }}>
              {loading ? "Repurposing..." : `Repurpose into ${rpCount} Post${rpCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {/* ── NEWS TAB ── */}
        {tab === "news" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>Trending AI Topics</h2>
                <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Pick a trending topic, generate a LinkedIn post instantly</p>
              </div>
              <button onClick={fetchNews} disabled={newsLoading} style={btnPrimary}>
                {newsLoading ? "Fetching..." : newsTopics.length ? "Refresh" : "Fetch Topics"}
              </button>
            </div>

            {newsLoading && <Loader text="Scanning AI news feeds..." />}

            {newsTopics.map((t, i) => (
              <div
                key={i}
                style={{
                  ...card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: T.text, fontSize: "14px", fontWeight: 700 }}>{t.title}</span>
                    <Tag color={t.trending_score >= 8 ? T.accent : t.trending_score >= 6 ? T.warn : T.textDim}>{t.trending_score}/10</Tag>
                    <Tag>{t.category}</Tag>
                  </div>
                  <div style={{ color: T.textMid, fontSize: "12.5px", lineHeight: 1.5 }}>{t.angle}</div>
                  <div style={{ color: T.textDim, fontSize: "11px", marginTop: "4px", fontFamily: T.mono }}>via {t.source_headline}</div>
                </div>
                <button
                  onClick={() => generateFromNews(t)}
                  disabled={loading}
                  style={{ ...btnPrimary, padding: "10px 18px", fontSize: "12px", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Generate
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── VOICE TAB ── */}
        {tab === "voice" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>Voice Clone</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Paste 3-5 of your LinkedIn posts to train your writing DNA</p>
            </div>

            <div style={{ ...card, background: T.accentDim, border: `1px solid ${T.accentMid}` }}>
              <span style={{ color: T.accent, fontSize: "12.5px", lineHeight: 1.6 }}>
                The AI will analyze your sentence structure, vocabulary, tone patterns, and signature moves. Your voice is saved to your account and auto-applied to all future posts.
              </span>
            </div>

            <div>
              <label style={labelStyle}>Your Sample Posts</label>
              <textarea
                value={voiceSamples}
                onChange={(e) => setVoiceSamples(e.target.value)}
                placeholder="Paste your LinkedIn posts here, separated by blank lines..."
                rows={12}
                style={inputBase}
              />
            </div>

            <button onClick={handleVoiceAnalyze} disabled={voiceLoading || !voiceSamples.trim()} style={{ ...btnPrimary, width: "100%", opacity: !voiceSamples.trim() ? 0.4 : 1 }}>
              {voiceLoading ? "Analyzing your voice..." : "Analyze & Clone Voice"}
            </button>

            {voiceProfile && (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <Tag color={T.success}>Voice Profile Active</Tag>
                </div>
                <p style={{ color: T.textMid, fontSize: "13px", lineHeight: 1.7, margin: "0 0 14px 0" }}>{voiceProfile.voice_profile}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                  {voiceProfile.key_traits?.map((t, i) => (
                    <Tag key={i} color={T.accent}>{t}</Tag>
                  ))}
                </div>
                {voiceProfile.avoid?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ color: T.textDim, fontSize: "10.5px", fontFamily: T.mono }}>AVOIDS:</span>
                    {voiceProfile.avoid.map((a, i) => (
                      <Tag key={i} color={T.danger}>{a}</Tag>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SCORE TAB ── */}
        {tab === "score" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>Score a Post</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Get AI feedback on any LinkedIn post's quality and engagement potential</p>
            </div>

            <div>
              <label style={labelStyle}>Post Content</label>
              <textarea value={scoreContent} onChange={(e) => setScoreContent(e.target.value)} placeholder="Paste a LinkedIn post to score..." rows={8} style={inputBase} />
            </div>

            <button onClick={handleScore} disabled={scoreLoading || !scoreContent.trim()} style={{ ...btnPrimary, width: "100%", opacity: !scoreContent.trim() ? 0.4 : 1 }}>
              {scoreLoading ? "Scoring..." : "Score Post"}
            </button>

            {scoreResult && (
              <div style={card}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "18px" }}>
                  {[
                    { label: "Overall", val: `${scoreResult.overall_score}/100`, color: scoreResult.overall_score >= 70 ? T.accent : T.warn },
                    { label: "Hook", val: `${scoreResult.hook_score}/10`, color: scoreResult.hook_score >= 7 ? T.accent : T.warn },
                    { label: "Readability", val: `${scoreResult.readability_score}/10`, color: scoreResult.readability_score >= 7 ? T.accent : T.warn },
                    { label: "Engagement", val: `${scoreResult.engagement_score}/10`, color: scoreResult.engagement_score >= 7 ? T.accent : T.warn },
                    { label: "Authenticity", val: `${scoreResult.authenticity_score}/10`, color: scoreResult.authenticity_score >= 7 ? T.accent : T.warn },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", minWidth: "80px" }}>
                      <div style={{ fontSize: "22px", fontWeight: 800, color: s.color, fontFamily: T.mono }}>{s.val}</div>
                      <div style={{ fontSize: "10px", color: T.textDim, fontFamily: T.mono, textTransform: "uppercase" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <span style={{ ...labelStyle, marginBottom: "6px" }}>Strengths</span>
                  {scoreResult.strengths?.map((s, i) => (
                    <div key={i} style={{ color: T.success, fontSize: "12.5px", marginBottom: "4px" }}>✓ {s}</div>
                  ))}
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <span style={{ ...labelStyle, marginBottom: "6px" }}>Improvements</span>
                  {scoreResult.improvements?.map((s, i) => (
                    <div key={i} style={{ color: T.warn, fontSize: "12.5px", marginBottom: "4px" }}>→ {s}</div>
                  ))}
                </div>

                {scoreResult.rewritten_hook && (
                  <div style={{ padding: "12px", background: T.bg, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
                    <span style={{ ...labelStyle, marginBottom: "6px" }}>Better Hook</span>
                    <div style={{ color: T.accent, fontSize: "13px", fontWeight: 600, fontStyle: "italic" }}>"{scoreResult.rewritten_hook}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SCHEDULE TAB ── */}
        {tab === "schedule" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: "0 0 4px 0" }}>Scheduled Posts</h2>
                <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>View and manage your publishing queue</p>
              </div>
              <button onClick={fetchSchedule} disabled={schedLoading} style={btnSecondary}>
                {schedLoading ? "..." : "Refresh"}
              </button>
            </div>

            {scheduledPosts.length === 0 && !schedLoading && (
              <div style={{ ...card, textAlign: "center", padding: "40px", color: T.textDim }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>📅</div>
                <div style={{ fontSize: "13px" }}>No scheduled posts yet. Generate a post and click "Schedule" to queue it up.</div>
              </div>
            )}

            {scheduledPosts.map((p) => (
              <div key={p.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <Tag color={p.status === "published" ? T.success : p.status === "scheduled" ? T.accent : p.status === "failed" ? T.danger : T.textDim}>
                      {p.status}
                    </Tag>
                    <span style={{ fontSize: "11px", color: T.textDim, fontFamily: T.mono }}>{p.id}</span>
                  </div>
                  <div style={{ color: T.text, fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden" }}>
                    {p.content}
                  </div>
                  <div style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono, marginTop: "8px" }}>
                    Scheduled: {new Date(p.scheduled_at).toLocaleString()}
                  </div>
                </div>
                {p.status === "scheduled" && (
                  <button onClick={() => cancelScheduled(p.id)} style={{ ...btnSecondary, color: T.danger, borderColor: T.danger, fontSize: "11px", padding: "6px 12px" }}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div style={{ animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", gap: "22px" }}>
            <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 800, margin: 0 }}>Settings</h2>

            {/* Account */}
            <div style={card}>
              <span style={labelStyle}>Account</span>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 16px", fontSize: "13px", marginTop: "8px" }}>
                <span style={{ color: T.textDim }}>Email</span>
                <span style={{ color: T.text }}>{user?.email}</span>
                <span style={{ color: T.textDim }}>Tier</span>
                <span><Tag color={T.accent}>{user?.tier}</Tag></span>
                <span style={{ color: T.textDim }}>User ID</span>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "11.5px" }}>{user?.user_id}</span>
              </div>
            </div>

            {/* LinkedIn */}
            <div style={card}>
              <span style={labelStyle}>LinkedIn Connection</span>
              <div style={{ marginTop: "10px" }}>
                {linkedinStatus?.connected ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.success }} />
                    <span style={{ color: T.success, fontSize: "13px", fontWeight: 600 }}>Connected</span>
                    <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>ID: {linkedinStatus.person_id}</span>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: T.textMid, fontSize: "12.5px", margin: "0 0 12px 0" }}>
                      Connect your LinkedIn to publish posts directly from LinkedCraft.
                    </p>
                    <button
                      onClick={() => window.open(`${API}/linkedin/auth`, "_blank")}
                      style={{ ...btnPrimary, fontSize: "12.5px" }}
                    >
                      Connect LinkedIn
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Voice */}
            <div style={card}>
              <span style={labelStyle}>Voice Profile</span>
              <div style={{ marginTop: "10px" }}>
                {voiceProfile || user?.has_voice_profile ? (
                  <Tag color={T.success}>Active — auto-applied to all posts</Tag>
                ) : (
                  <span style={{ color: T.textDim, fontSize: "12.5px" }}>Not configured. Go to Voice Clone tab to set up.</span>
                )}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setToken(null);
                setUser(null);
              }}
              style={{ ...btnSecondary, color: T.danger, borderColor: T.danger, width: "fit-content" }}
            >
              Sign Out
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              marginTop: "18px",
              padding: "12px 16px",
              borderRadius: T.radiusSm,
              background: T.dangerDim,
              color: T.danger,
              fontSize: "12.5px",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <Loader />}

        {/* ── Generated Posts ── */}
        {posts.length > 0 && (
          <div ref={resultsRef} style={{ marginTop: "28px", animation: "fadeUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: T.accent, fontSize: "14px", fontWeight: 700 }}>Generated Posts</span>
              <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>{posts.length} result{posts.length > 1 ? "s" : ""}</span>
            </div>
            {posts.map((p, i) => (
              <PostCard key={i} post={p} idx={i} token={token} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
