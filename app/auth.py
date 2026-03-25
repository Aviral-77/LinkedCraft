"""
User Auth — Registration, login, API key management, and rate limiting.

Features:
  - Email/password registration and login (JWT-based)
  - API key generation for programmatic access
  - Three tiers: free, pro, enterprise (with different rate limits)
  - Rate limiting per user per hour
  - Middleware that authenticates via Bearer token OR X-Api-Key header
  - Password hashing with bcrypt

Database: SQLite (same as scheduler — swap for PostgreSQL in production)
"""

import sqlite3
import uuid
import hashlib
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path

import jwt
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import settings

DB_PATH = Path(__file__).parent / "auth.db"
security = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_auth_db():
    """Create users and api_keys tables."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            tier TEXT NOT NULL DEFAULT 'free',
            linkedin_access_token TEXT,
            linkedin_person_id TEXT,
            linkedin_token_expires_at TEXT,
            voice_profile TEXT,
            persona_profile TEXT,
            industry TEXT,
            audience_segments TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS linkedin_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            synced_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            key TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT 'Default',
            created_at TEXT NOT NULL,
            last_used_at TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS rate_limits (
            user_id TEXT NOT NULL,
            hour_bucket TEXT NOT NULL,
            request_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, hour_bucket)
        );
    """)

    # Migrate existing databases — add new columns if they don't exist yet
    for col, typedef in [("persona_profile", "TEXT")]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
            conn.commit()
        except Exception:
            pass  # Column already exists

    conn.commit()
    conn.close()


# ──────────────────────────────────────────────
# Password hashing (SHA-256 + salt — use bcrypt in production)
# ──────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password with a random salt."""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against the stored hash."""
    salt, hashed = stored_hash.split(":")
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed


# ──────────────────────────────────────────────
# JWT tokens
# ──────────────────────────────────────────────

def create_jwt(user_id: str, email: str, tier: str) -> str:
    """Create a JWT token for a user."""
    payload = {
        "sub": user_id,
        "email": email,
        "tier": tier,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ──────────────────────────────────────────────
# User CRUD
# ──────────────────────────────────────────────

def create_user(email: str, password: str, name: str = "") -> dict:
    """Register a new user. Returns user dict + JWT token."""
    conn = _get_db()

    # Check if email exists
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        raise ValueError("Email already registered")

    user_id = str(uuid.uuid4())[:12]
    now = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(password)

    conn.execute(
        """INSERT INTO users (id, email, password_hash, name, tier, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'free', ?, ?)""",
        (user_id, email.lower().strip(), pw_hash, name, now, now),
    )
    conn.commit()
    conn.close()

    token = create_jwt(user_id, email, "free")

    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "tier": "free",
        "token": token,
        "created_at": now,
    }


def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Authenticate a user by email/password. Returns user dict + JWT token."""
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
    ).fetchone()
    conn.close()

    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None

    token = create_jwt(row["id"], row["email"], row["tier"])

    return {
        "user_id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "tier": row["tier"],
        "token": token,
        "has_linkedin": bool(row["linkedin_access_token"]),
    }


def get_user(user_id: str) -> Optional[dict]:
    """Get a user by ID."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def update_user_linkedin(user_id: str, access_token: str, person_id: str, expires_at: str):
    """Store LinkedIn OAuth tokens for a user."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """UPDATE users SET linkedin_access_token = ?, linkedin_person_id = ?,
           linkedin_token_expires_at = ?, updated_at = ? WHERE id = ?""",
        (access_token, person_id, expires_at, now, user_id),
    )
    conn.commit()
    conn.close()


def update_user_profile(user_id: str, voice_profile: str = None, industry: str = None, audience_segments: str = None):
    """Update a user's saved preferences."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()

    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return None

    vp = voice_profile if voice_profile is not None else user["voice_profile"]
    ind = industry if industry is not None else user["industry"]
    aud = audience_segments if audience_segments is not None else user["audience_segments"]

    conn.execute(
        """UPDATE users SET voice_profile = ?, industry = ?, audience_segments = ?, updated_at = ?
           WHERE id = ?""",
        (vp, ind, aud, now, user_id),
    )
    conn.commit()
    conn.close()
    return True


def update_persona_profile(user_id: str, persona_profile: str) -> None:
    """Save the AI-extracted persona profile (JSON string) for a user."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "UPDATE users SET persona_profile = ?, updated_at = ? WHERE id = ?",
        (persona_profile, now, user_id),
    )
    conn.commit()
    conn.close()


def save_user_posts(user_id: str, posts: list) -> None:
    """Replace the user's stored LinkedIn posts with a fresh sync."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("DELETE FROM linkedin_posts WHERE user_id = ?", (user_id,))
    conn.executemany(
        "INSERT INTO linkedin_posts (user_id, content, synced_at) VALUES (?, ?, ?)",
        [(user_id, p, now) for p in posts],
    )
    conn.commit()
    conn.close()


def get_user_posts(user_id: str) -> list:
    """Return stored LinkedIn posts for a user."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT content, synced_at FROM linkedin_posts WHERE user_id = ? ORDER BY id DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    return [{"content": r["content"], "synced_at": r["synced_at"]} for r in rows]


def upgrade_user_tier(user_id: str, tier: str):
    """Upgrade a user's tier (free, pro, enterprise)."""
    if tier not in ("free", "pro", "enterprise"):
        raise ValueError("Invalid tier")
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE users SET tier = ?, updated_at = ? WHERE id = ?", (tier, now, user_id))
    conn.commit()
    conn.close()


# ──────────────────────────────────────────────
# API Keys
# ──────────────────────────────────────────────

def create_api_key(user_id: str, name: str = "Default") -> dict:
    """Generate a new API key for a user."""
    key = f"lc_{secrets.token_hex(24)}"
    now = datetime.now(timezone.utc).isoformat()

    conn = _get_db()
    conn.execute(
        "INSERT INTO api_keys (key, user_id, name, created_at) VALUES (?, ?, ?, ?)",
        (key, user_id, name, now),
    )
    conn.commit()
    conn.close()

    return {"key": key, "name": name, "created_at": now}


def list_api_keys(user_id: str) -> list[dict]:
    """List all API keys for a user (keys are masked)."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()

    return [
        {
            "key": f"{row['key'][:7]}...{row['key'][-4:]}",
            "key_full": row["key"],
            "name": row["name"],
            "is_active": bool(row["is_active"]),
            "created_at": row["created_at"],
            "last_used_at": row["last_used_at"],
        }
        for row in rows
    ]


def revoke_api_key(user_id: str, key_prefix: str) -> bool:
    """Revoke an API key. Match by prefix (first 7 chars)."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    result = conn.execute(
        """UPDATE api_keys SET is_active = 0 WHERE user_id = ? AND key LIKE ?""",
        (user_id, f"{key_prefix}%"),
    )
    conn.commit()
    conn.close()
    return result.rowcount > 0


def validate_api_key(key: str) -> Optional[dict]:
    """Validate an API key and return the associated user."""
    conn = _get_db()
    row = conn.execute(
        """SELECT ak.*, u.email, u.tier, u.voice_profile, u.persona_profile,
                  u.industry, u.audience_segments,
                  u.linkedin_access_token, u.linkedin_person_id
           FROM api_keys ak JOIN users u ON ak.user_id = u.id
           WHERE ak.key = ? AND ak.is_active = 1""",
        (key,),
    ).fetchone()

    if not row:
        conn.close()
        return None

    # Update last_used_at
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("UPDATE api_keys SET last_used_at = ? WHERE key = ?", (now, key))
    conn.commit()
    conn.close()

    return {
        "user_id": row["user_id"],
        "email": row["email"],
        "tier": row["tier"],
        "voice_profile": row["voice_profile"],
        "persona_profile": row["persona_profile"],
        "industry": row["industry"],
        "audience_segments": row["audience_segments"],
        "linkedin_access_token": row["linkedin_access_token"],
        "linkedin_person_id": row["linkedin_person_id"],
    }


# ──────────────────────────────────────────────
# Rate limiting
# ──────────────────────────────────────────────

def check_rate_limit(user_id: str, tier: str) -> dict:
    """Check and increment rate limit. Returns remaining requests."""
    limits = {
        "free": settings.RATE_LIMIT_FREE,
        "pro": settings.RATE_LIMIT_PRO,
        "enterprise": settings.RATE_LIMIT_ENTERPRISE,
    }
    max_requests = limits.get(tier, settings.RATE_LIMIT_FREE)

    hour_bucket = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")

    conn = _get_db()
    row = conn.execute(
        "SELECT request_count FROM rate_limits WHERE user_id = ? AND hour_bucket = ?",
        (user_id, hour_bucket),
    ).fetchone()

    current_count = row["request_count"] if row else 0

    if current_count >= max_requests:
        conn.close()
        return {
            "allowed": False,
            "limit": max_requests,
            "remaining": 0,
            "reset_at": f"{hour_bucket}:59:59Z",
        }

    # Increment
    if row:
        conn.execute(
            "UPDATE rate_limits SET request_count = request_count + 1 WHERE user_id = ? AND hour_bucket = ?",
            (user_id, hour_bucket),
        )
    else:
        conn.execute(
            "INSERT INTO rate_limits (user_id, hour_bucket, request_count) VALUES (?, ?, 1)",
            (user_id, hour_bucket),
        )
    conn.commit()
    conn.close()

    return {
        "allowed": True,
        "limit": max_requests,
        "remaining": max_requests - current_count - 1,
        "reset_at": f"{hour_bucket}:59:59Z",
    }


# ──────────────────────────────────────────────
# FastAPI dependency — authenticate requests
# ──────────────────────────────────────────────

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Authenticate a request via:
      1. Bearer JWT token (from login)
      2. X-Api-Key header (for programmatic access)

    Returns user dict with id, email, tier, and stored preferences.
    """

    # Method 1: X-Api-Key header
    api_key = request.headers.get("X-Api-Key")
    if api_key:
        user = validate_api_key(api_key)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")
        return user

    # Method 2: Bearer token
    if credentials:
        payload = decode_jwt(credentials.credentials)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = get_user(payload["sub"])
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return {
            "user_id": user["id"],
            "email": user["email"],
            "tier": user["tier"],
            "voice_profile": user.get("voice_profile"),
            "industry": user.get("industry"),
            "audience_segments": user.get("audience_segments"),
            "linkedin_access_token": user.get("linkedin_access_token"),
            "linkedin_person_id": user.get("linkedin_person_id"),
        }

    raise HTTPException(
        status_code=401,
        detail="Authentication required. Use 'Authorization: Bearer <token>' or 'X-Api-Key: <key>'",
    )


async def require_rate_limit(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that checks rate limits after authentication."""
    result = check_rate_limit(user["user_id"], user["tier"])
    if not result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. {result['limit']} requests/hour on {user['tier']} plan. Resets at {result['reset_at']}",
        )
    # Attach rate limit info to user dict
    user["rate_limit"] = result
    return user
