"""Optional shared-secret check so only the Trackit backend can call the service."""

import secrets

from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings


def require_service_token(
    x_service_token: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.service_token:
        return
    if x_service_token is None or not secrets.compare_digest(x_service_token, settings.service_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing service token")
