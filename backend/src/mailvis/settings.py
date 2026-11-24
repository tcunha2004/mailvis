"""Runtime configuration, read from environment variables (and a local .env in development)."""

import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mailvis:mailvis@localhost:5432/mailvis")

# Any "provider:model" string accepted by LangChain's init_chat_model / init_embeddings.
LLM_MODEL = os.getenv(
    "LLM_MODEL", "bedrock_converse:global.anthropic.claude-haiku-4-5-20251001-v1:0"
)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "bedrock:amazon.titan-embed-text-v2:0")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "1024"))

DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "default")
