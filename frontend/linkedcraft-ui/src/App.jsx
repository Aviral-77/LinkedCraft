import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const T = {
  bg: "#ffffff",
  surface: "#f8f9fa",
  border: "#e5e7eb",
  text: "#0a0a0a",
  textMid: "#6b7280",
  textDim: "#9ca3af",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  accentDim: "rgba(37,99,235,0.06)",
  danger: "#ef4444",
  success: "#22c55e",
  warn: "#f59e0b",
  purple: "#a78bfa",
  amber: "#f59e0b",
  blue: "#60a5fa",
  radius: "8px",
  radiusSm: "6px",
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

const FRAMEWORKS = [
  { id: "hook-story-offer", name: "Hook → Story → Offer" },
  { id: "contrarian-take", name: "Contrarian Take" },
  { id: "listicle", name: "Numbered Listicle" },
  { id: "before-after", name: "Before → After" },
  { id: "aida", name: "AIDA" },
  { id: "pas", name: "PAS" },
  { id: "carousel-script", name: "Carousel" },
  { id: "storytelling", name: "Micro Story" },
];

const TONES = [
  { id: "professional", name: "Professional" },
  { id: "conversational", name: "Conversational" },
  { id: "bold", name: "Bold" },
  { id: "inspirational", name: "Inspirational" },
  { id: "witty", name: "Witty" },
  { id: "analytical", name: "Data-Driven" },
  { id: "vulnerable", name: "Vulnerable" },
  { id: "authoritative", name: "Authoritative" },
];

const AUDIENCES = [
  { id: "founders", label: "Founders" },
  { id: "marketers", label: "Marketers" },
  { id: "developers", label: "Developers" },
  { id: "recruiters", label: "HR & Recruiters" },
  { id: "sales", label: "Sales" },
  { id: "jobseekers", label: "Job Seekers" },
  { id: "executives", label: "C-Suite" },
  { id: "creators", label: "Creators" },
];

const SOURCE_TYPES = [
  { id: "blog", label: "Blog Post" },
  { id: "podcast", label: "Podcast" },
  { id: "tweet", label: "Tweet" },
  { id: "presentation", label: "Talk" },
  { id: "email", label: "Newsletter" },
  { id: "notes", label: "Notes" },
];

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

const btnBase = {
  border: "none",
  cursor: "pointer",
  fontFamily: T.font,
  fontWeight: 600,
  transition: "background-color 0.15s, border-color 0.15s, opacity 0.15s",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

const btnPrimary = {
  ...btnBase,
  background: T.accent,
  color: "#ffffff",
  padding: "11px 22px",
  borderRadius: T.radiusSm,
  fontSize: "13px",
};

const btnSecondary = {
  ...btnBase,
  background: "transparent",
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
  border: `1px solid ${T.border}`,
  background: "#ffffff",
  color: T.text,
  fontSize: "13px",
  fontFamily: T.font,
  outline: "none",
  transition: "border-color 0.15s",
  boxSizing: "border-box",
};

const labelStyle = {
  color: T.textDim,
  fontSize: "10px",
  fontWeight: 600,
  fontFamily: T.mono,
  letterSpacing: "0.08em",
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

function Pill({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        padding: "7px 14px",
        borderRadius: T.radiusSm,
        fontSize: "12px",
        fontWeight: 500,
        border: `1px solid ${selected ? T.accent : T.border}`,
        background: selected ? "#ffffff" : "transparent",
        color: selected ? T.accent : T.textMid,
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
        fontSize: "10px",
        fontFamily: T.mono,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: "4px",
        border: `1px solid ${color}`,
        background: `${color}15`,
        color: T.text,
        display: "inline-block",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function Loader({ text = "Generating..." }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: "16px" }}>
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: T.accent,
              animation: `ldPulse 1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ color: T.textDim, fontSize: "12px", fontFamily: T.font }}>{text}</span>
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
    <div style={{ background: "#ffffff", borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "20px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: T.accent }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <Tag color={T.textDim}>POST {idx + 1}</Tag>
          <Tag color={post.hook_score >= 8 ? T.accent : post.hook_score >= 6 ? T.warn : T.danger}>
            Hook {post.hook_score}/10
          </Tag>
          <Tag color={{ viral: T.accent, high: T.success, medium: T.warn, low: T.danger }[post.engagement_prediction] || T.textDim}>
            {post.engagement_prediction}
          </Tag>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={handleCopy} style={{ ...btnSecondary, padding: "6px 14px", fontSize: "11px" }}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            style={{
              ...btnSecondary,
              padding: "6px 14px",
              fontSize: "11px",
              borderColor: published ? T.success : T.border,
              color: published ? T.success : T.textMid,
              opacity: publishing || published ? 0.7 : 1,
            }}
          >
            {published ? "Published" : publishing ? "..." : "Publish"}
          </button>
          <button
            onClick={() => setScheduleOpen(!scheduleOpen)}
            style={{
              ...btnSecondary,
              padding: "6px 14px",
              fontSize: "11px",
              borderColor: scheduled ? T.accent : T.border,
              color: scheduled ? T.accent : T.textMid,
            }}
          >
            {scheduled ? "Scheduled" : "Schedule"}
          </button>
        </div>
      </div>

      {scheduleOpen && !scheduled && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px", padding: "10px 12px", background: T.surface, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
          <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={{ ...inputBase, width: "auto", flex: 1 }} />
          <button onClick={handleSchedule} style={{ ...btnPrimary, padding: "8px 16px", fontSize: "12px" }}>
            Confirm
          </button>
        </div>
      )}

      <div style={{ color: T.text, fontSize: "14px", lineHeight: 1.75, fontFamily: T.font, whiteSpace: "pre-wrap", marginBottom: "16px" }}>
        {post.content}
      </div>

      <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap", fontSize: "11px", color: T.textDim, fontFamily: T.mono, paddingTop: "14px", borderTop: `1px solid ${T.border}` }}>
        <span>
          Best: <span style={{ color: T.accent, fontWeight: 600 }}>{post.best_time}</span>
        </span>
        <span style={{ color: T.border }}>•</span>
        <span>{post.tip}</span>
      </div>
    </div>
  );
}

export default function LinkedCraftDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem("linkedcraft_token") || null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState("generate");

  const [topic, setTopic] = useState("");
  const [framework, setFramework] = useState("");
  const [tone, setTone] = useState("conversational");
  const [postCount, setPostCount] = useState(1);
  const [audiences, setAudiences] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rpContent, setRpContent] = useState("");
  const [rpType, setRpType] = useState("blog");
  const [rpAngle, setRpAngle] = useState("");
  const [rpCount, setRpCount] = useState(3);

  const [voiceSamples, setVoiceSamples] = useState("");
  const [voiceProfile, setVoiceProfile] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [extInstalled, setExtInstalled] = useState(false);
  const [persona, setPersona] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showExtModal, setShowExtModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [newsTopics, setNewsTopics] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);

  const [linkedinStatus, setLinkedinStatus] = useState(null);

  const [apiKeys, setApiKeys] = useState([]);
  const [newApiKey, setNewApiKey] = useState(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [scoreContent, setScoreContent] = useState("");
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const resultsRef = useRef(null);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const body = authMode === "register" ? { email: authEmail, password: authPass, name: authName } : { email: authEmail, password: authPass };
      const data = await api(path, { method: "POST", body });
      setToken(data.token);
      setUser(data);
      localStorage.setItem("linkedcraft_token", data.token);
    } catch (e) {
      setAuthError(e.message);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    api("/auth/me", { token })
      .then((u) => {
        setUser(u);
        if (u.persona) setPersona(u.persona);
      })
      .catch(() => {});
    api("/linkedin/status", { token }).then(setLinkedinStatus).catch(() => {});
  }, [token]);

  useEffect(() => {
    const handler = () => setExtInstalled(true);
    window.addEventListener("linkedcraft-ext-ready", handler);
    return () => window.removeEventListener("linkedcraft-ext-ready", handler);
  }, []);

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

  const handleRefreshVoice = async () => {
    try {
      const userData = await api("/auth/me", { token });
      setUser(userData);
      if (userData.persona) setPersona(userData.persona);
    } catch (e) {
      setError(e.message);
    }
  };

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
    try {
      const data = await api("/news/generate", {
        method: "POST",
        token,
        body: { topic_title: t.title, topic_angle: t.angle, source_headline: t.source_headline, tone, audience_segments: audiences },
      });
      setPosts(data.posts || []);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

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

  const fetchApiKeys = async () => {
    try {
      const data = await api("/auth/api-keys", { token });
      setApiKeys(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const generateApiKey = async () => {
    setApiKeyLoading(true);
    setNewApiKey(null);
    try {
      const data = await api("/auth/api-keys", { method: "POST", token, body: { name: "Default" } });
      setNewApiKey(data.key);
      fetchApiKeys();
    } catch (e) {
      setError(e.message);
    }
    setApiKeyLoading(false);
  };

  const revokeApiKey = async (prefix) => {
    try {
      await api(`/auth/api-keys/${prefix}`, { method: "DELETE", token });
      setApiKeys((prev) => prev.filter((k) => !k.key.startsWith(prefix)));
    } catch (e) {
      alert(e.message);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          input:focus, textarea:focus { border-color: ${T.accent} !important; outline: none; }
        `}</style>

        <div style={{ width: "360px", padding: "36px", background: "#ffffff", borderRadius: T.radius, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: T.radiusSm, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
              L
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "16px", color: T.text, letterSpacing: "-0.01em" }}>LinkedCraft</div>
              <div style={{ fontSize: "10px", color: T.textDim, fontFamily: T.mono, marginTop: "1px" }}>AI Post Engine</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "4px", marginBottom: "24px", padding: "3px", background: T.surface, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setAuthMode(m);
                  setAuthError("");
                }}
                style={{
                  ...btnBase,
                  flex: 1,
                  padding: "8px",
                  fontSize: "12px",
                  background: authMode === m ? "#ffffff" : "transparent",
                  color: authMode === m ? T.text : T.textMid,
                  borderRadius: "4px",
                  border: "none",
                  textTransform: "capitalize",
                  fontWeight: authMode === m ? 600 : 400,
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {authMode === "register" && <input placeholder="Name" value={authName} onChange={(e) => setAuthName(e.target.value)} style={inputBase} />}
            <input placeholder="Email" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={inputBase} />
            <input placeholder="Password" type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} style={inputBase} onKeyDown={(e) => e.key === "Enter" && handleAuth()} />

            {authError && (
              <div style={{ color: T.danger, fontSize: "12px", padding: "10px 12px", background: T.dangerDim, borderRadius: T.radiusSm, border: `1px solid ${T.danger}40` }}>
                {authError}
              </div>
            )}

            <button onClick={handleAuth} disabled={authLoading} style={{ ...btnPrimary, width: "100%", marginTop: "4px", opacity: authLoading ? 0.6 : 1 }}>
              {authLoading ? "..." : authMode === "register" ? "Create Account" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const NAV = [
    { id: "generate", label: "Generate" },
    { id: "repurpose", label: "Repurpose" },
    { id: "voice", label: "Source" },
    { id: "news", label: "AI News" },
    { id: "score", label: "Score" },
    { id: "schedule", label: "Schedule" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes ldPulse { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
        input:focus, textarea:focus, select:focus { border-color: ${T.accent} !important; outline: none; }
        textarea { resize: vertical; }
        button:hover:not(:disabled) { opacity: 0.9; }
        button:disabled { cursor: not-allowed; }
      `}</style>

      <div style={{ width: "200px", minHeight: "100vh", background: "#ffffff", borderRight: `1px solid ${T.border}`, padding: "24px 16px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "32px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: T.radiusSm, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 900, color: "#ffffff" }}>
            L
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: T.text, letterSpacing: "-0.01em" }}>LinkedCraft</div>
            <div style={{ fontSize: "10px", color: T.textDim, fontFamily: T.mono, marginTop: "1px" }}>AI Post Engine</div>
          </div>
        </div>

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
                padding: "10px 12px",
                borderRadius: T.radiusSm,
                background: tab === n.id ? T.accentDim : "transparent",
                color: tab === n.id ? T.accent : T.textMid,
                fontSize: "13px",
                fontWeight: tab === n.id ? 600 : 500,
                width: "100%",
                borderLeft: tab === n.id ? `2px solid ${T.accent}` : "2px solid transparent",
              }}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "14px", borderRadius: T.radiusSm, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: "12px", color: T.text, fontWeight: 600, marginBottom: "4px" }}>{user?.email}</div>
          {persona?.personality?.length > 0 && (
            <div style={{ fontSize: "10px", color: T.accent, fontFamily: T.mono, marginBottom: "6px", letterSpacing: "0.02em" }}>
              {persona.personality.join(" · ")}
            </div>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Tag color={T.accent}>{user?.tier || "free"}</Tag>
            {linkedinStatus?.connected && <Tag color={T.success}>LinkedIn</Tag>}
            {(voiceProfile || user?.has_voice_profile || persona) && <Tag color={T.purple}>Voice</Tag>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "40px 48px", maxWidth: "860px", overflow: "auto" }}>
        {tab === "generate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>Generate</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Create LinkedIn posts from a topic or idea</p>
            </div>

            <div>
              <label style={labelStyle}>What do you want to write about?</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Why most startups fail at hiring their first 10 employees..." rows={3} style={inputBase} />
            </div>

            <div>
              <label style={labelStyle}>Tone</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {TONES.map((t) => (
                  <Pill key={t.id} selected={tone === t.id} onClick={() => setTone(t.id)}>
                    {t.name}
                  </Pill>
                ))}
              </div>
            </div>

            <button onClick={() => setShowAdvanced((p) => !p)} style={{ ...btnBase, justifyContent: "space-between", padding: "11px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: "transparent", color: T.textDim, fontSize: "12px", width: "100%" }}>
              <span>Advanced options {showAdvanced ? "" : "(framework, audience, variations)"}</span>
              <span style={{ fontFamily: T.mono }}>{showAdvanced ? "↑" : "↓"}</span>
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={labelStyle}>Framework</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {FRAMEWORKS.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => setFramework(framework === fw.id ? "" : fw.id)}
                        style={{
                          ...btnBase,
                          justifyContent: "flex-start",
                          padding: "10px 14px",
                          borderRadius: T.radiusSm,
                          border: `1px solid ${framework === fw.id ? T.accent : T.border}`,
                          background: framework === fw.id ? T.accentDim : "#ffffff",
                          color: framework === fw.id ? T.accent : T.text,
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {fw.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Audience</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {AUDIENCES.map((a) => (
                      <Pill key={a.id} selected={audiences.includes(a.id)} onClick={() => setAudiences((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]))}>
                        {a.label}
                      </Pill>
                    ))}
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
                          width: "48px",
                          height: "40px",
                          borderRadius: T.radiusSm,
                          border: `1px solid ${postCount === n ? T.accent : T.border}`,
                          background: postCount === n ? T.accentDim : "#ffffff",
                          color: postCount === n ? T.accent : T.text,
                          fontFamily: T.mono,
                          fontSize: "14px",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ ...btnPrimary, width: "100%", opacity: !topic.trim() || loading ? 0.5 : 1 }}>
              {loading ? "Generating..." : `Generate Post${postCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {tab === "repurpose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>Repurpose</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Turn existing content into LinkedIn posts</p>
            </div>

            <div>
              <label style={labelStyle}>Source Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {SOURCE_TYPES.map((s) => (
                  <Pill key={s.id} selected={rpType === s.id} onClick={() => setRpType(s.id)}>
                    {s.label}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Paste Your Content</label>
              <textarea value={rpContent} onChange={(e) => setRpContent(e.target.value)} placeholder="Paste your blog post, transcript, newsletter..." rows={10} style={inputBase} />
            </div>

            <div>
              <label style={labelStyle}>
                Focus Angle <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>(optional)</span>
              </label>
              <input value={rpAngle} onChange={(e) => setRpAngle(e.target.value)} placeholder="e.g., Focus on the hiring insights..." style={inputBase} />
            </div>

            <div>
              <label style={labelStyle}>Posts to Generate</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 3, 5].map((n) => (
                  <button key={n} onClick={() => setRpCount(n)} style={{ ...btnBase, flex: 1, height: "40px", borderRadius: T.radiusSm, border: `1px solid ${rpCount === n ? T.accent : T.border}`, background: rpCount === n ? T.accentDim : "#ffffff", color: rpCount === n ? T.accent : T.text, fontFamily: T.mono }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleRepurpose} disabled={loading || !rpContent.trim()} style={{ ...btnPrimary, width: "100%", opacity: !rpContent.trim() || loading ? 0.5 : 1 }}>
              {loading ? "Repurposing..." : `Repurpose into ${rpCount} Post${rpCount > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {tab === "voice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>Source</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Sync your LinkedIn voice so AI writes like you</p>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: T.text }}>One-Click Sync</span>
                    {extInstalled ? <Tag color={T.success}>Extension Ready</Tag> : <Tag color={T.textDim}>Not Installed</Tag>}
                  </div>
                  <p style={{ color: T.textMid, fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
                    {extInstalled
                      ? "Click the LinkedCraft Helper icon in your toolbar and click Sync My Posts. It will read your recent LinkedIn posts and update your voice profile."
                      : "Install the browser extension to automatically sync your LinkedIn posts. No passwords — it only reads post text."}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {!extInstalled && (
                    <button onClick={() => setShowExtModal(true)} style={{ ...btnPrimary, whiteSpace: "nowrap", fontSize: "12px", padding: "9px 16px" }}>
                      Install Extension
                    </button>
                  )}
                  <button onClick={handleRefreshVoice} style={{ ...btnSecondary, whiteSpace: "nowrap", fontSize: "12px", padding: "8px 16px" }}>
                    Refresh Profile
                  </button>
                </div>
              </div>

              {extInstalled && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {["Click the LinkedCraft Helper icon in your browser", 'Click "Sync My Posts" to collect your posts', 'Come back here and click "Refresh Profile"'].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: T.accentDim, border: `1px solid ${T.accent}40`, color: T.accent, fontSize: "10px", fontFamily: T.mono, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ color: T.textMid, fontSize: "13px", lineHeight: 1.5, paddingTop: "2px" }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {persona && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {persona.personality?.length > 0 && (
                  <div style={{ ...card, background: T.accentDim, border: `1px solid ${T.accent}30` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <Tag color={T.success}>Your LinkedIn DNA</Tag>
                      <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>auto-applied</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {persona.personality.map((p, i) => (
                        <span
                          key={i}
                          style={{
                            padding: "7px 16px",
                            borderRadius: T.radiusSm,
                            background: "#ffffff",
                            border: `1px solid ${T.accent}`,
                            color: T.accent,
                            fontSize: "13px",
                            fontWeight: 600,
                            letterSpacing: "0.01em",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {persona.interests?.length > 0 && (
                    <div style={card}>
                      <span style={labelStyle}>Core Interests</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
                        {persona.interests.map((item, i) => (
                          <Tag key={i} color={T.blue}>
                            {item}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.expertise_areas?.length > 0 && (
                    <div style={card}>
                      <span style={labelStyle}>Expertise</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
                        {persona.expertise_areas.map((item, i) => (
                          <Tag key={i} color={T.purple}>
                            {item}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {persona.content_themes?.length > 0 && (
                  <div style={card}>
                    <span style={labelStyle}>What you write about</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                      {persona.content_themes.map((theme, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ color: T.accent, fontFamily: T.mono, fontSize: "10px" }}>→</span>
                          <span style={{ color: T.textMid, fontSize: "13px" }}>{theme}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {persona.key_traits?.length > 0 && (
                    <div style={card}>
                      <span style={labelStyle}>Writing Traits</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
                        {persona.key_traits.map((t, i) => (
                          <div key={i} style={{ color: T.textMid, fontSize: "12px", lineHeight: 1.4 }}>
                            <span style={{ color: T.accent }}>✓</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {persona.audience_fit?.length > 0 && (
                    <div style={card}>
                      <span style={labelStyle}>Audience Fit</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
                        {persona.audience_fit.map((a, i) => (
                          <Tag key={i} color={T.amber}>
                            {a}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
              <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: T.border }} />
            </div>

            <button onClick={() => setShowManualInput((p) => !p)} style={{ ...btnBase, justifyContent: "space-between", padding: "11px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: "transparent", color: T.textDim, fontSize: "12px", width: "100%" }}>
              <span>Paste manually</span>
              <span style={{ fontFamily: T.mono }}>{showManualInput ? "↑" : "↓"}</span>
            </button>

            {showManualInput && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <textarea value={voiceSamples} onChange={(e) => setVoiceSamples(e.target.value)} placeholder="Paste 3-5 of your best LinkedIn posts, separated by blank lines..." rows={10} style={inputBase} />
                <button onClick={handleVoiceAnalyze} disabled={voiceLoading || !voiceSamples.trim()} style={{ ...btnPrimary, width: "100%", opacity: !voiceSamples.trim() || voiceLoading ? 0.5 : 1 }}>
                  {voiceLoading ? "Analyzing..." : "Analyze & Save Voice"}
                </button>
              </div>
            )}

            {showExtModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={(e) => e.target === e.currentTarget && setShowExtModal(false)}>
                <div style={{ background: "#ffffff", borderRadius: T.radius, border: `1px solid ${T.border}`, padding: "32px", width: "480px", maxWidth: "90vw" }}>
                  <h3 style={{ color: T.text, fontSize: "18px", fontWeight: 700, margin: "0 0 12px 0" }}>Install Extension</h3>
                  <p style={{ color: T.textMid, fontSize: "13px", lineHeight: 1.6, margin: "0 0 20px 0" }}>The Chrome extension reads your post text from LinkedIn. No passwords, no private data.</p>

                  <div style={{ ...card, background: T.surface, padding: "16px", marginBottom: "20px" }}>
                    <span style={labelStyle}>Setup Steps</span>
                    {["Open chrome://extensions → Enable Developer Mode", 'Click "Load unpacked" → select chrome-extension/ folder', "Pin the LinkedCraft Helper icon", "Stay logged in here"].map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", marginTop: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: T.accent, fontFamily: T.mono, fontSize: "10px", fontWeight: 700, background: T.accentDim, border: `1px solid ${T.accent}40`, width: "18px", height: "18px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                          {i + 1}
                        </span>
                        <span style={{ color: T.textMid, fontSize: "12px", lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => setShowExtModal(false)} style={{ ...btnSecondary, flex: 1 }}>
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowExtModal(false);
                        setShowManualInput(true);
                      }}
                      style={{ ...btnSecondary, flex: 1 }}
                    >
                      Paste manually
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "news" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>AI News</h2>
                <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Trending topics from AI and tech news</p>
              </div>
              <button onClick={fetchNews} disabled={newsLoading} style={{ ...btnPrimary, opacity: newsLoading ? 0.6 : 1 }}>
                {newsLoading ? "Fetching..." : newsTopics.length ? "Refresh" : "Fetch Topics"}
              </button>
            </div>

            {newsLoading && <Loader text="Scanning news feeds..." />}

            {newsTopics.map((t, i) => (
              <div key={i} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: T.text, fontSize: "14px", fontWeight: 600 }}>{t.title}</span>
                    <Tag color={t.trending_score >= 8 ? T.accent : t.trending_score >= 6 ? T.warn : T.textDim}>{t.trending_score}/10</Tag>
                    <Tag color={T.textDim}>{t.category}</Tag>
                  </div>
                  <div style={{ color: T.textMid, fontSize: "13px", lineHeight: 1.5, marginBottom: "4px" }}>{t.angle}</div>
                  <div style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>via {t.source_headline}</div>
                </div>
                <button onClick={() => generateFromNews(t)} disabled={loading} style={{ ...btnPrimary, padding: "9px 18px", fontSize: "12px", whiteSpace: "nowrap", opacity: loading ? 0.6 : 1 }}>
                  Generate
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "score" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>Score</h2>
              <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Analyze quality and engagement potential</p>
            </div>

            <div>
              <label style={labelStyle}>Paste a LinkedIn post to score...</label>
              <textarea value={scoreContent} onChange={(e) => setScoreContent(e.target.value)} placeholder="Paste a LinkedIn post..." rows={8} style={inputBase} />
            </div>

            <button onClick={handleScore} disabled={scoreLoading || !scoreContent.trim()} style={{ ...btnPrimary, width: "100%", opacity: !scoreContent.trim() || scoreLoading ? 0.5 : 1 }}>
              {scoreLoading ? "Scoring..." : "Score Post"}
            </button>

            {scoreResult && (
              <div style={card}>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                  {[
                    { label: "Overall", val: `${scoreResult.overall_score}/100`, color: scoreResult.overall_score >= 70 ? T.accent : T.warn },
                    { label: "Hook", val: `${scoreResult.hook_score}/10`, color: scoreResult.hook_score >= 7 ? T.accent : T.warn },
                    { label: "Read", val: `${scoreResult.readability_score}/10`, color: scoreResult.readability_score >= 7 ? T.accent : T.warn },
                    { label: "Engage", val: `${scoreResult.engagement_score}/10`, color: scoreResult.engagement_score >= 7 ? T.accent : T.warn },
                    { label: "Auth", val: `${scoreResult.authenticity_score}/10`, color: scoreResult.authenticity_score >= 7 ? T.accent : T.warn },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", minWidth: "72px" }}>
                      <div style={{ fontSize: "24px", fontWeight: 800, color: s.color, fontFamily: T.mono, letterSpacing: "-0.02em" }}>{s.val}</div>
                      <div style={{ fontSize: "10px", color: T.textDim, fontFamily: T.mono, textTransform: "uppercase", marginTop: "2px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <span style={{ ...labelStyle, marginBottom: "8px" }}>Strengths</span>
                  {scoreResult.strengths?.map((s, i) => (
                    <div key={i} style={{ color: T.success, fontSize: "13px", marginBottom: "4px" }}>
                      ✓ {s}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <span style={{ ...labelStyle, marginBottom: "8px" }}>Improvements</span>
                  {scoreResult.improvements?.map((s, i) => (
                    <div key={i} style={{ color: T.textMid, fontSize: "13px", marginBottom: "4px" }}>
                      → {s}
                    </div>
                  ))}
                </div>

                {scoreResult.rewritten_hook && (
                  <div style={{ padding: "14px", background: T.accentDim, borderRadius: T.radiusSm, border: `1px solid ${T.accent}30` }}>
                    <span style={{ ...labelStyle, marginBottom: "8px" }}>Better Hook</span>
                    <div style={{ color: T.accent, fontSize: "13px", fontWeight: 600, fontStyle: "italic" }}>"{scoreResult.rewritten_hook}"</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: "0 0 6px 0" }}>Schedule</h2>
                <p style={{ color: T.textDim, fontSize: "13px", margin: 0 }}>Your publishing queue</p>
              </div>
              <button onClick={fetchSchedule} disabled={schedLoading} style={{ ...btnSecondary, opacity: schedLoading ? 0.6 : 1 }}>
                {schedLoading ? "..." : "Refresh"}
              </button>
            </div>

            {scheduledPosts.length === 0 && !schedLoading && (
              <div style={{ ...card, textAlign: "center", padding: "60px 20px", color: T.textDim }}>
                <div style={{ fontSize: "13px" }}>No scheduled posts yet</div>
              </div>
            )}

            {scheduledPosts.map((p) => (
              <div key={p.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                    <Tag color={p.status === "published" ? T.success : p.status === "scheduled" ? T.accent : p.status === "failed" ? T.danger : T.textDim}>{p.status}</Tag>
                    <span style={{ fontSize: "11px", color: T.textDim, fontFamily: T.mono }}>{p.id}</span>
                  </div>
                  <div style={{ color: T.text, fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden" }}>{p.content}</div>
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

        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <h2 style={{ color: T.text, fontSize: "20px", fontWeight: 700, margin: 0 }}>Settings</h2>

            <div style={card}>
              <span style={labelStyle}>Account</span>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px 16px", fontSize: "13px", marginTop: "10px" }}>
                <span style={{ color: T.textDim }}>Email</span>
                <span style={{ color: T.text }}>{user?.email}</span>
                <span style={{ color: T.textDim }}>Tier</span>
                <span>
                  <Tag color={T.accent}>{user?.tier}</Tag>
                </span>
                <span style={{ color: T.textDim }}>User ID</span>
                <span style={{ color: T.textMid, fontFamily: T.mono, fontSize: "11px" }}>{user?.user_id}</span>
              </div>
            </div>

            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <span style={labelStyle}>API Keys</span>
                  <p style={{ color: T.textDim, fontSize: "12px", margin: "4px 0 0 0" }}>For programmatic access</p>
                </div>
                <button
                  onClick={() => {
                    fetchApiKeys();
                    generateApiKey();
                  }}
                  disabled={apiKeyLoading}
                  style={{ ...btnPrimary, fontSize: "12px", padding: "9px 16px", opacity: apiKeyLoading ? 0.6 : 1 }}
                >
                  {apiKeyLoading ? "..." : "+ New Key"}
                </button>
              </div>

              {newApiKey && (
                <div style={{ padding: "12px", background: T.accentDim, border: `1px solid ${T.accent}40`, borderRadius: T.radiusSm, marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: T.accent, fontSize: "11px", fontWeight: 700, fontFamily: T.mono }}>NEW KEY — SAVE IT NOW</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newApiKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      style={{ ...btnSecondary, padding: "4px 10px", fontSize: "11px", borderColor: T.accent, color: T.accent }}
                    >
                      {copiedKey ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div style={{ fontFamily: T.mono, fontSize: "11px", color: T.text, wordBreak: "break-all", padding: "8px 10px", background: "#ffffff", borderRadius: "4px", border: `1px solid ${T.border}` }}>
                    {newApiKey}
                  </div>
                </div>
              )}

              {apiKeys.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {apiKeys.map((k) => (
                    <div key={k.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: T.surface, borderRadius: T.radiusSm, border: `1px solid ${T.border}` }}>
                      <div>
                        <span style={{ color: T.text, fontSize: "12px", fontWeight: 600 }}>{k.name}</span>
                        <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono, marginLeft: "10px" }}>{k.key}</span>
                      </div>
                      <button onClick={() => revokeApiKey(k.key.substring(0, 7))} style={{ ...btnBase, padding: "4px 10px", fontSize: "11px", color: T.danger, background: "transparent" }}>
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={fetchApiKeys} style={{ ...btnSecondary, width: "100%", fontSize: "12px" }}>
                  Load keys
                </button>
              )}
            </div>

            <div style={card}>
              <span style={labelStyle}>LinkedIn</span>
              <div style={{ marginTop: "10px" }}>
                {linkedinStatus?.connected ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: T.success }} />
                    <span style={{ color: T.success, fontSize: "13px", fontWeight: 600 }}>Connected</span>
                    <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>ID: {linkedinStatus.person_id}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <span style={{ color: T.textMid, fontSize: "13px" }}>Connect to publish directly</span>
                    <button onClick={() => window.open(`${API}/linkedin/auth`, "_blank")} style={{ ...btnPrimary, fontSize: "12px", padding: "9px 16px" }}>
                      Connect
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setToken(null);
                setUser(null);
                localStorage.removeItem("linkedcraft_token");
              }}
              style={{ ...btnSecondary, color: T.danger, borderColor: T.danger, width: "fit-content" }}
            >
              Sign Out
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "20px", padding: "12px 16px", borderRadius: T.radiusSm, background: T.dangerDim, color: T.danger, fontSize: "13px", border: `1px solid ${T.danger}40` }}>
            {error}
          </div>
        )}

        {loading && <Loader />}

        {posts.length > 0 && (
          <div ref={resultsRef} style={{ marginTop: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: T.accent, fontSize: "14px", fontWeight: 700 }}>Generated Posts</span>
              <span style={{ color: T.textDim, fontSize: "11px", fontFamily: T.mono }}>
                {posts.length} result{posts.length > 1 ? "s" : ""}
              </span>
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
