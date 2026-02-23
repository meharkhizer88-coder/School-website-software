from fastapi import APIRouter

from backend.controllers.settings_controller import get_settings, update_settings
from backend.models.schemas import SystemSettings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings_route():
    return get_settings()


@router.put("")
def update_settings_route(payload: SystemSettings):
    return update_settings(payload)
