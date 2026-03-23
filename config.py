"""
Configuration — loads from environment variables or .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = "your-api-key-here"
    MODEL: str = "claude-sonnet-4-20250514"
    MAX_TOKENS: int = 4096
    MAX_CONTENT_LENGTH: int = 5000  # max chars for repurpose input

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
