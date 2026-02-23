from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config.settings import get_settings
from backend.middleware.error_handler import register_exception_handlers
from backend.routes import auth, dashboard, settings

app_settings = get_settings()
app = FastAPI(title=app_settings.app_name, version=app_settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router, prefix=app_settings.api_prefix)
app.include_router(dashboard.router, prefix=app_settings.api_prefix)
app.include_router(settings.router, prefix=app_settings.api_prefix)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": app_settings.app_version}
