"""FastAPI application entry point for Hermes Dashboard backend.

Run with:
    cd /root/hermes-dash/backend && uvicorn main:app --host 0.0.0.0 --port 8080
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth import verify_token
from routes.tokens import router as tokens_router
from routes.system import router as system_router
from routes.repos import router as repos_router
from routes.timeline import router as timeline_router
from routes.claude import router as claude_router
from routes.brain import router as brain_router
from routes.reminders import router as reminders_router
from routes.email import router as email_router
from routes.calendar import router as calendar_router
from routes.jobs import router as jobs_router
from routes.push import router as push_router
from routes.gamification import router as gamification_router
from routes.webhook import router as webhook_router
from routes.sessions import router as sessions_router
from routes.upload import router as upload_router
from chat_ws import router as chat_ws_router

app = FastAPI(
    title="Hermes Dashboard API",
    description="Backend API for the Hermes Dashboard — monitors token usage, system stats, git repos, and more.",
    version="1.0.0",
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to prevent crashes
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# Health check (no auth required)
@app.get("/api/health")
def health():
    return {"status": "ok"}


# Auth-required routes
app.include_router(tokens_router)
app.include_router(system_router)
app.include_router(repos_router)
app.include_router(timeline_router)
app.include_router(claude_router)
app.include_router(brain_router)
app.include_router(reminders_router)
app.include_router(upload_router)
app.include_router(email_router)
app.include_router(calendar_router)
app.include_router(jobs_router)
app.include_router(push_router)
app.include_router(gamification_router)
app.include_router(webhook_router)
app.include_router(sessions_router)
app.include_router(chat_ws_router)
