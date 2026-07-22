from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AdminCredential
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminTokenResponse,
)
from app.utils.admin_auth import (
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter(
    prefix="/admin-auth",
    tags=["Admin Authentication"]
)

security = HTTPBearer()


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(
    request: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    credential = db.query(AdminCredential).filter(
        AdminCredential.username == request.username
    ).first()

    if not credential:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not verify_password(
        request.password,
        credential.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    user = db.query(User).filter(
        User.id == credential.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Administrator user record not found"
        )

    if user.role != "university_admin":
        raise HTTPException(
            status_code=403,
            detail="This account is not a university administrator"
        )

    if user.status != "active":
        raise HTTPException(
            status_code=403,
            detail=f"Administrator account is {user.status}"
        )

    access_token = create_access_token(
        user_id=user.id,
        username=credential.username,
        role=user.role
    )

    return {
        "message": "Administrator login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": credential.username,
        "role": user.role,
        "status": user.status
    }


@router.get("/me", response_model=AdminTokenResponse)
def get_logged_in_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    credential = db.query(AdminCredential).filter(
        AdminCredential.user_id == user_id
    ).first()

    if not user or not credential:
        raise HTTPException(
            status_code=401,
            detail="Administrator account not found"
        )

    if user.role != "university_admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required"
        )

    if user.status != "active":
        raise HTTPException(
            status_code=403,
            detail=f"Administrator account is {user.status}"
        )

    return {
        "user_id": user.id,
        "username": credential.username,
        "role": user.role,
        "status": user.status
    }