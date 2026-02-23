from backend.models.schemas import ApiResponse, SystemSettings
from backend.services.store import store


def get_settings() -> ApiResponse:
    return ApiResponse(success=True, data=store.settings.model_dump(), message="Settings fetched")


def update_settings(settings: SystemSettings) -> ApiResponse:
    store.settings = settings
    return ApiResponse(success=True, data=store.settings.model_dump(), message="Settings updated")
