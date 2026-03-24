"""
Post Scheduler — Schedule LinkedIn posts for future publishing.

Uses SQLite for persistence and APScheduler for background execution.
In production, replace the publish_post() stub with actual LinkedIn API integration.

Features:
  - Schedule posts for a specific date/time
  - List all scheduled, published, and failed posts
  - Cancel/update scheduled posts
  - Background worker checks every minute and publishes due posts
"""

import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

DB_PATH = Path(__file__).parent / "scheduler.db"


def _get_db() -> sqlite3.Connection:
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create the scheduled_posts table if it doesn't exist."""
    conn = _get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_posts (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            scheduled_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            published_at TEXT,
            error TEXT,
            metadata TEXT
        )
    """)
    conn.commit()
    conn.close()


def schedule_post(
    content: str,
    scheduled_at: datetime,
    metadata: Optional[str] = None,
) -> dict:
    """Schedule a new post. Returns the created record."""
    post_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    scheduled_iso = scheduled_at.isoformat()

    conn = _get_db()
    conn.execute(
        """INSERT INTO scheduled_posts (id, content, scheduled_at, status, created_at, updated_at, metadata)
           VALUES (?, ?, ?, 'scheduled', ?, ?, ?)""",
        (post_id, content, scheduled_iso, now, now, metadata),
    )
    conn.commit()
    conn.close()

    return {
        "id": post_id,
        "content": content,
        "scheduled_at": scheduled_iso,
        "status": "scheduled",
        "created_at": now,
    }


def list_posts(status: Optional[str] = None) -> list[dict]:
    """List all scheduled posts, optionally filtered by status."""
    conn = _get_db()
    if status:
        rows = conn.execute(
            "SELECT * FROM scheduled_posts WHERE status = ? ORDER BY scheduled_at ASC",
            (status,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM scheduled_posts ORDER BY scheduled_at ASC"
        ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_post(post_id: str) -> Optional[dict]:
    """Get a single scheduled post by ID."""
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM scheduled_posts WHERE id = ?", (post_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def cancel_post(post_id: str) -> Optional[dict]:
    """Cancel a scheduled post. Only works if status is 'scheduled'."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    result = conn.execute(
        """UPDATE scheduled_posts SET status = 'cancelled', updated_at = ?
           WHERE id = ? AND status = 'scheduled'""",
        (now, post_id),
    )
    conn.commit()

    if result.rowcount == 0:
        conn.close()
        return None

    row = conn.execute(
        "SELECT * FROM scheduled_posts WHERE id = ?", (post_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_post(post_id: str, content: Optional[str] = None, scheduled_at: Optional[datetime] = None) -> Optional[dict]:
    """Update a scheduled post's content or time. Only works if status is 'scheduled'."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()

    post = conn.execute(
        "SELECT * FROM scheduled_posts WHERE id = ? AND status = 'scheduled'", (post_id,)
    ).fetchone()

    if not post:
        conn.close()
        return None

    new_content = content if content is not None else post["content"]
    new_scheduled = scheduled_at.isoformat() if scheduled_at else post["scheduled_at"]

    conn.execute(
        """UPDATE scheduled_posts SET content = ?, scheduled_at = ?, updated_at = ?
           WHERE id = ?""",
        (new_content, new_scheduled, now, post_id),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM scheduled_posts WHERE id = ?", (post_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_due_posts() -> list[dict]:
    """Get all posts that are due for publishing (scheduled_at <= now)."""
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM scheduled_posts WHERE status = 'scheduled' AND scheduled_at <= ?",
        (now,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def mark_published(post_id: str):
    """Mark a post as published."""
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_db()
    conn.execute(
        """UPDATE scheduled_posts SET status = 'published', published_at = ?, updated_at = ?
           WHERE id = ?""",
        (now, now, post_id),
    )
    conn.commit()
    conn.close()


def mark_failed(post_id: str, error: str):
    """Mark a post as failed with an error message."""
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_db()
    conn.execute(
        """UPDATE scheduled_posts SET status = 'failed', error = ?, updated_at = ?
           WHERE id = ?""",
        (error, now, post_id),
    )
    conn.commit()
    conn.close()


async def publish_post(content: str) -> bool:
    """
    STUB: Publish a post to LinkedIn.

    Replace this with actual LinkedIn API integration:
    ─────────────────────────────────────────────────
    POST https://api.linkedin.com/v2/ugcPosts
    Headers:
      Authorization: Bearer {access_token}
      Content-Type: application/json

    Body:
    {
      "author": "urn:li:person:{person_id}",
      "lifecycleState": "PUBLISHED",
      "specificContent": {
        "com.linkedin.ugc.ShareContent": {
          "shareCommentary": { "text": content },
          "shareMediaCategory": "NONE"
        }
      },
      "visibility": {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }
    ─────────────────────────────────────────────────

    Returns True if published successfully, False otherwise.
    """
    # TODO: Replace with real LinkedIn API call
    print(f"[SCHEDULER] Publishing post: {content[:80]}...")
    return True


async def process_due_posts():
    """Check for due posts and publish them. Called by the background scheduler."""
    due = get_due_posts()
    for post in due:
        try:
            success = await publish_post(post["content"])
            if success:
                mark_published(post["id"])
                print(f"[SCHEDULER] Published post {post['id']}")
            else:
                mark_failed(post["id"], "LinkedIn API returned failure")
        except Exception as e:
            mark_failed(post["id"], str(e))
            print(f"[SCHEDULER] Failed to publish post {post['id']}: {e}")
