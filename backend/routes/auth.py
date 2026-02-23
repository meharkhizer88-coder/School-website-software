from fastapi import APIRouter, Response

from backend.controllers.auth_controller import login
from backend.models.schemas import LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login_route(payload: LoginRequest, response: Response):
    return login(payload, response)
