"""
LinkedIn OAuth 2.0 — Authorization, token exchange, and posting.

Flow:
  1. GET  /linkedin/auth          → Redirects user to LinkedIn consent screen
  2. GET  /linkedin/callback      → LinkedIn redirects back with auth code
  3. POST /linkedin/publish       → Publish a post to the user's LinkedIn feed
  4. GET  /linkedin/status        → Check if user has a valid LinkedIn connection

Setup:
  1. Go to https://www.linkedin.com/developers/apps
  2. Create an app, request "openid", "profile", "w_member_social" scopes
  3. Set redirect URI to your LINKEDIN_REDIRECT_URI
  4. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env
"""

import httpx
from typing import Optional
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta

from config import settings


LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_POST_URL = "https://api.linkedin.com/v2/ugcPosts"

SCOPES = "openid profile w_member_social"


def get_auth_url(state: str) -> str:
    """
    Build the LinkedIn OAuth authorization URL.
    The state parameter should be the user's JWT or a CSRF token.
    """
    params = {
        "response_type": "code",
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "state": state,
        "scope": SCOPES,
    }
    return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """
    Exchange the authorization code for an access token.
    Returns: {access_token, expires_in, scope}
    """
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if resp.status_code != 200:
            error_body = resp.text
            raise Exception(f"LinkedIn token exchange failed ({resp.status_code}): {error_body}")

        data = resp.json()

    expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 3600))
    ).isoformat()

    return {
        "access_token": data["access_token"],
        "expires_in": data.get("expires_in", 3600),
        "expires_at": expires_at,
        "scope": data.get("scope", ""),
    }


async def get_profile(access_token: str) -> dict:
    """
    Fetch the authenticated user's LinkedIn profile.
    Returns: {sub (person ID), name, email, picture}
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            LINKEDIN_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if resp.status_code != 200:
            raise Exception(f"LinkedIn profile fetch failed ({resp.status_code}): {resp.text}")

        data = resp.json()

    return {
        "person_id": data.get("sub", ""),
        "name": data.get("name", ""),
        "email": data.get("email", ""),
        "picture": data.get("picture", ""),
    }


async def publish_post(access_token: str, person_id: str, content: str) -> dict:
    """
    Publish a text post to the user's LinkedIn feed.

    Returns: {id, status} on success.
    Raises Exception on failure.
    """
    payload = {
        "author": f"urn:li:person:{person_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": content},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            LINKEDIN_POST_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
        )

        if resp.status_code not in (200, 201):
            raise Exception(f"LinkedIn publish failed ({resp.status_code}): {resp.text}")

        data = resp.json()

    return {
        "linkedin_post_id": data.get("id", ""),
        "status": "published",
    }


def is_token_valid(expires_at: Optional[str]) -> bool:
    """Check if a stored LinkedIn token is still valid."""
    if not expires_at:
        return False
    try:
        exp = datetime.fromisoformat(expires_at)
        return exp > datetime.now(timezone.utc)
    except (ValueError, TypeError):
        return False
