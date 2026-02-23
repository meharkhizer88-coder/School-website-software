from fastapi import Response

from backend.models.schemas import ApiResponse, LoginRequest
from backend.services.auth_service import authenticate_user, generate_token


def login(payload: LoginRequest, response: Response) -> ApiResponse:
    user = authenticate_user(payload.username, payload.password)
    token = generate_token(user)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=3600,
    )
    return ApiResponse(success=True, data={"user": user}, message="Login successful", code=200)
