"""Postgres access: one connection pool shared by the emails table, the LangGraph
checkpointer (conversation state) and the LangGraph store (memories, examples, instructions)."""

from typing import Any

from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore
from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from mailvis import settings

pool = ConnectionPool(
    settings.DATABASE_URL,
    open=False,
    max_size=10,
    kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
)

SCHEMA = [
    """
    CREATE TABLE IF NOT EXISTS emails (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          TEXT NOT NULL,
        author           TEXT NOT NULL,
        recipient        TEXT NOT NULL,
        subject          TEXT NOT NULL,
        body             TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'processing'
                         CHECK (status IN ('processing', 'saved', 'trashed', 'failed')),
        triage_reasoning TEXT,
        priority         TEXT CHECK (priority IN ('low', 'medium', 'high')),
        summary          TEXT,
        error            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS emails_user_created_idx ON emails (user_id, created_at DESC)",
]

COLUMNS = sql.SQL(
    'id, user_id, author, recipient AS "to", subject, body, status, triage_reasoning, '
    "priority, summary, error, created_at, updated_at"
)

UPDATABLE = {"status", "triage_reasoning", "priority", "summary", "error"}


def setup() -> tuple[PostgresSaver, PostgresStore]:
    """Open the pool, create tables and return the LangGraph checkpointer and store."""
    pool.open(wait=True)
    with pool.connection() as conn:
        for statement in SCHEMA:
            conn.execute(statement)

    checkpointer = PostgresSaver(pool)  # type: ignore[arg-type]
    checkpointer.setup()
    store = PostgresStore(
        pool,  # type: ignore[arg-type]
        index={"embed": settings.EMBEDDING_MODEL, "dims": settings.EMBEDDING_DIMS},
    )
    store.setup()
    return checkpointer, store


def ping() -> None:
    with pool.connection() as conn:
        conn.execute("SELECT 1")


def create_email(user_id: str, email: dict[str, str]) -> dict[str, Any]:
    query = sql.SQL(
        "INSERT INTO emails (user_id, author, recipient, subject, body) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING {}"
    ).format(COLUMNS)
    with pool.connection() as conn:
        params = (user_id, email["author"], email["to"], email["subject"], email["body"])
        return conn.execute(query, params).fetchone()  # type: ignore[return-value]


def get_email(user_id: str, email_id: str) -> dict[str, Any] | None:
    query = sql.SQL("SELECT {} FROM emails WHERE id = %s AND user_id = %s").format(COLUMNS)
    with pool.connection() as conn:
        return conn.execute(query, (email_id, user_id)).fetchone()  # type: ignore[return-value]


def list_emails(user_id: str, status: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    query = sql.SQL(
        "SELECT {} FROM emails WHERE user_id = %s AND (%s::text IS NULL OR status = %s) "
        "ORDER BY created_at DESC LIMIT %s"
    ).format(COLUMNS)
    with pool.connection() as conn:
        return conn.execute(query, (user_id, status, status, limit)).fetchall()  # type: ignore[return-value]


def update_email(email_id: str, **fields: Any) -> dict[str, Any] | None:
    unknown = fields.keys() - UPDATABLE
    if unknown:
        raise ValueError(f"Cannot update columns: {unknown}")
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = %s").format(sql.Identifier(name)) for name in fields
    )
    query = sql.SQL("UPDATE emails SET {}, updated_at = now() WHERE id = %s RETURNING {}").format(
        assignments, COLUMNS
    )
    with pool.connection() as conn:
        return conn.execute(query, (*fields.values(), email_id)).fetchone()  # type: ignore[return-value]


def delete_email(user_id: str, email_id: str) -> bool:
    with pool.connection() as conn:
        cur = conn.execute("DELETE FROM emails WHERE id = %s AND user_id = %s", (email_id, user_id))
        return cur.rowcount > 0
