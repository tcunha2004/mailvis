import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from mailvis import db
from mailvis.agent.graph import build_graph
from mailvis.api.routes import emails, instructions, memories

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    checkpointer, store = db.setup()
    app.state.checkpointer = checkpointer
    app.state.store = store
    app.state.graph = build_graph(checkpointer, store)
    yield
    db.pool.close()


app = FastAPI(
    title="MailVis API",
    description="AI email assistant: triage, prioritization, long-term memory and "
    "instructions that improve from your feedback.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(emails.router, prefix="/api")
app.include_router(memories.router, prefix="/api")
app.include_router(instructions.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    try:
        db.ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc
    return {"status": "ok"}
