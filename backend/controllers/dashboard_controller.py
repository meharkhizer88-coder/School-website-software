from backend.models.schemas import ApiResponse
from backend.services.dashboard_service import get_dashboard_analytics, get_dashboard_stats
from backend.services.store import store


def stats() -> ApiResponse:
    return ApiResponse(success=True, data=get_dashboard_stats(), message="Stats fetched")


def analytics() -> ApiResponse:
    return ApiResponse(success=True, data=get_dashboard_analytics(), message="Analytics fetched")


def notices() -> ApiResponse:
    return ApiResponse(
        success=True,
        data={"items": [notice.model_dump(mode="json") for notice in store.notices]},
        message="Notices fetched",
    )
