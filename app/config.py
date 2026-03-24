"""
Configuration — loads from environment variables or .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROVIDER: str = "gemini"  # "anthropic" or "gemini"
    # Anthropic
    ANTHROPIC_API_KEY: str = "your-api-key-here"
    MODEL: str = "claude-3-5-sonnet-20241022"

     # Gemini settings
    GEMINI_API_KEY: str = "AIzaSyD6bObpgdeQwwJvq3xm64mv6xCJUi4Z2ls"
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Common settings
    MAX_TOKENS: int = 4096
    MAX_CONTENT_LENGTH: int = 5000  # max chars for repurpose input

    # LinkedIn OAuth 2.0
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = "http://localhost:8000/linkedin/callback"

    # Auth
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 72

    # Rate limiting (requests per hour per user)
    RATE_LIMIT_FREE: int = 10
    RATE_LIMIT_PRO: int = 100
    RATE_LIMIT_ENTERPRISE: int = 1000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
