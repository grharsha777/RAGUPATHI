"""Application configuration loaded from environment variables via Pydantic Settings."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from pydantic import AliasChoices, Field, HttpUrl, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized, typed configuration for the RAGHUPATI backend.

    All secrets are represented as ``SecretStr`` and must never be logged or
    serialized to clients. Validation ensures URLs and numeric bounds are sane
    at process startup.
    """

    model_config = SettingsConfigDict(
        env_file="../.env.local",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Core application ---
    app_name: str = Field(
        default="RAGHUPATI",
        description="Service display name for logs and health payloads.",
    )
    environment: str = Field(
        default="development",
        description="Deployment environment (e.g. development, staging, production).",
    )
    log_level: str = Field(
        default="INFO",
        description="Minimum log level for structlog (DEBUG, INFO, WARNING, ERROR, CRITICAL).",
    )
    cors_origins: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed CORS origins (Next.js default included).",
    )
    max_patch_retries: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum autonomous patch/QA retry cycles before human escalation.",
    )
    github_webhook_rate_limit_per_minute: int = Field(
        default=120,
        ge=1,
        description="Soft rate limit for webhook endpoint (per client IP) per minute.",
    )
    external_api_timeout_seconds: float = Field(
        default=60.0,
        gt=0,
        description="Default timeout for outbound HTTP calls (NVD, GitHub, search, etc.).",
    )
    nvd_results_per_page: int = Field(
        default=50,
        ge=1,
        le=2000,
        description="Page size for NVD CVE API queries.",
    )

    # --- LLM / inference providers ---
    mistral_api_key: SecretStr = Field(
        ...,
        description="Mistral API key for Rama (Large), Jambavan (Medium), and Nala (Codestral).",
    )
    groq_api_key: SecretStr = Field(
        ...,
        description="Groq API key for Hanuman, Angada, Sugreeva, and Vibhishana models.",
    )
    huggingface_token: SecretStr | None = Field(
        default=None,
        description="Optional Hugging Face token for inference API fallback.",
    )
    nvidia_nim_api_key: SecretStr | None = Field(
        default=None,
        description="Optional NVIDIA NIM API key for accelerated inference.",
    )

    # --- GitHub ---
    github_token: SecretStr = Field(
        ...,
        description="GitHub PAT with repo, pull request, and webhook administration scopes.",
    )
    github_webhook_secret: SecretStr = Field(
        ...,
        description="Shared secret used to verify GitHub webhook HMAC-SHA256 signatures.",
    )
    github_api_base_url: HttpUrl = Field(
        default="https://api.github.com",
        description="GitHub REST API base URL (override for GitHub Enterprise).",
    )

    # --- Search & research ---
    tavily_api_key: SecretStr = Field(
        ...,
        description="Tavily API key for Jambavan web research.",
    )
    exa_api_key: SecretStr | None = Field(
        default=None,
        description="Optional Exa API key for supplemental neural search.",
    )

    # --- Vulnerability intelligence ---
    nvd_api_key: SecretStr = Field(
        ...,
        description="NVD API 2.0 key for CVE queries (required for higher rate limits).",
    )
    osv_base_url: HttpUrl = Field(
        default="https://api.osv.dev",
        description="OSV API base URL for ecosystem vulnerability lookups.",
    )

    # --- Data plane ---
    supabase_url: HttpUrl = Field(
        ...,
        description="Supabase project URL.",
    )
    supabase_key: SecretStr = Field(
        ...,
        description="Supabase service role or anon key used by the backend.",
    )

    # --- Notifications ---
    slack_webhook_url: SecretStr | None = Field(
        default=None,
        description="Slack incoming webhook URL for Vibhishana alerts.",
    )
    sendgrid_api_key: SecretStr | None = Field(
        default=None,
        description="SendGrid API key for HTML incident emails.",
    )
    sendgrid_from_email: str = Field(
        default="noreply@example.com",
        description="Verified SendGrid sender address.",
    )
    sendgrid_from_name: str = Field(
        default="RAGHUPATI Guardian",
        description="Friendly sender name for outbound email.",
    )
    incident_email_to: str | None = Field(
        default=None,
        description="Optional default recipient for incident report emails.",
    )

    # --- Auth (API / NextAuth) ---
    google_client_id: str = Field(
        ...,
        description="Google OAuth client ID used to validate Google-issued ID tokens.",
    )
    nextauth_secret: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("NEXTAUTH_SECRET", "nextauth_secret"),
        description="Optional NextAuth JWT secret for validating HS256 session tokens.",
    )

    # --- Local multimodal fallback ---
    ollama_base_url: HttpUrl = Field(
        default="http://localhost:11434",
        description="Ollama server base URL for Gemma3 / LLaVA multimodal parsing.",
    )

    # --- Mem0 / Chroma ---
    mem0_api_key: SecretStr | None = Field(
        default=None,
        description="Optional Mem0 cloud API key; omit for local Mem0 usage.",
    )
    chroma_persist_directory: str = Field(
        default="./data/chroma",
        description="Filesystem path for persisted ChromaDB data.",
    )
    chroma_collection_incidents: str = Field(
        default="raghupati_incidents",
        description="Chroma collection name for incident RAG embeddings.",
    )

    # --- Agent model identifiers (override per deployment) ---
    model_rama: str = Field(
        default="mistral-large-latest",
        description="Mistral model id for Rama (commander).",
    )
    model_hanuman: str = Field(
        default="llama-4-scout-17b-16e-instruct",
        description="Groq model id for Hanuman (watcher).",
    )
    model_angada: str = Field(
        default="mixtral-8x7b-32768",
        description="Groq model id for Angada (security).",
    )
    model_jambavan: str = Field(
        default="mistral-medium-latest",
        description="Mistral model id for Jambavan (analyst).",
    )
    model_nala: str = Field(
        default="codestral-latest",
        description="Mistral model id for Nala (patch).",
    )
    model_sugreeva: str = Field(
        default="llama-4-scout-17b-16e-instruct",
        description="Groq model id for Sugreeva (QA).",
    )
    model_vibhishana: str = Field(
        default="llama3-8b-8192",
        description="Groq model id for Vibhishana (comms).",
    )

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, value: str) -> str:
        """Normalize and validate the configured log level.

        Args:
            value: Raw log level string from the environment.

        Returns:
            Uppercased log level accepted by the logging module.

        Raises:
            ValueError: If the level is not a standard logging level name.
        """
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = value.upper()
        if upper not in allowed:
            msg = f"log_level must be one of {sorted(allowed)}"
            raise ValueError(msg)
        return upper

    @field_validator("cors_origins")
    @classmethod
    def strip_cors_origins(cls, value: str) -> str:
        """Trim whitespace around each CORS origin entry.

        Args:
            value: Comma-separated origins string.

        Returns:
            Cleaned comma-separated string.
        """
        parts = [part.strip() for part in value.split(",")]
        return ",".join(p for p in parts if p)

    def cors_origin_list(self) -> list[str]:
        """Return CORS origins as a list for FastAPI middleware.

        Returns:
            List of origin URL strings.
        """
        if not self.cors_origins:
            return []
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def safe_public_dict(self) -> dict[str, Any]:
        """Return non-secret configuration for diagnostics (health/debug only).

        Returns:
            Dictionary of safe, non-sensitive settings.
        """
        return {
            "app_name": self.app_name,
            "environment": self.environment,
            "log_level": self.log_level,
            "max_patch_retries": self.max_patch_retries,
            "github_api_base_url": str(self.github_api_base_url),
            "osv_base_url": str(self.osv_base_url),
            "ollama_base_url": str(self.ollama_base_url),
            "chroma_persist_directory": self.chroma_persist_directory,
            "models": {
                "rama": self.model_rama,
                "hanuman": self.model_hanuman,
                "angada": self.model_angada,
                "jambavan": self.model_jambavan,
                "nala": self.model_nala,
                "sugreeva": self.model_sugreeva,
                "vibhishana": self.model_vibhishana,
            },
        }


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance (singleton per process).

    Returns:
        Loaded and validated ``Settings`` object.
    """
    return Settings()
