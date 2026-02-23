from fastapi import APIRouter

from backend.controllers.dashboard_controller import analytics, notices, stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats_route():
    return stats()


@router.get("/analytics")
def analytics_route():
    return analytics()


@router.get("/notices")
def notices_route():
    return notices()
