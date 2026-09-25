from datetime import (
    datetime,
    timedelta,
    timezone,
)

from fastapi import (
    Depends,
    HTTPException,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from jose import (
    JWTError,
    jwt,
)

from sqlalchemy.orm import Session

from app.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

from app.database import get_db
from app.models import User


bearer_scheme = HTTPBearer(
    auto_error=False
)


# ==========================================================
# ADMINISTRATIVE ROLES
# ==========================================================

ADMIN_ROLES = {
    "university_admin",
    "technical_admin",
}


# ==========================================================
# CREATE ADMIN ACCESS TOKEN
# ==========================================================

def create_admin_access_token(
    user: User,
):

    expiry = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user.id),
        "wallet": user.wallet_address,
        "role": user.role,
        "exp": expiry,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ==========================================================
# COMMON ADMIN AUTHENTICATION
# ==========================================================

def _get_authenticated_admin_user(
    credentials: HTTPAuthorizationCredentials,
    db: Session,
) -> User:

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Administrator authentication required.",
        )

    try:

        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired administrator token.",
        )

    user_id = payload.get("sub")
    token_role = payload.get("role")
    token_wallet = payload.get("wallet")

    if (
        not user_id
        or not token_wallet
        or token_role not in ADMIN_ROLES
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid administrator token.",
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid administrator identity.",
        )

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Administrator was not found.",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=403,
            detail="Administrator account is inactive.",
        )

    if user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Administrative access required.",
        )

    # If the user's role was changed after the JWT
    # was created, force a new login.
    if user.role != token_role:
        raise HTTPException(
            status_code=401,
            detail=(
                "Administrator role has changed. "
                "Please sign in again."
            ),
        )

    # If the administrator wallet was changed,
    # an old JWT must no longer remain valid.
    if (
        user.wallet_address.lower()
        != token_wallet.lower()
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Administrator wallet has changed. "
                "Please sign in again."
            ),
        )

    return user


# ==========================================================
# ANY ADMINISTRATIVE USER
#
# technical_admin OR university_admin
# ==========================================================

def get_current_staff(
    credentials:
        HTTPAuthorizationCredentials
        = Depends(bearer_scheme),

    db: Session = Depends(get_db),
):

    return _get_authenticated_admin_user(
        credentials,
        db,
    )


# ==========================================================
# UNIVERSITY ADMIN ONLY
#
# Used for:
# - student approval
# - minting
# - revocation
# - wallet replacement
# ==========================================================

def get_current_admin(
    credentials:
        HTTPAuthorizationCredentials
        = Depends(bearer_scheme),

    db: Session = Depends(get_db),
):

    user = _get_authenticated_admin_user(
        credentials,
        db,
    )

    if user.role != "university_admin":
        raise HTTPException(
            status_code=403,
            detail=(
                "University Administrator "
                "access required."
            ),
        )

    return user


# ==========================================================
# TECHNICAL ADMIN ONLY
#
# Used for:
# - creating university administrators
# - disabling/reactivating administrators
# - changing administrator wallets
# ==========================================================

def get_current_technical_admin(
    credentials:
        HTTPAuthorizationCredentials
        = Depends(bearer_scheme),

    db: Session = Depends(get_db),
):

    user = _get_authenticated_admin_user(
        credentials,
        db,
    )

    if user.role != "technical_admin":
        raise HTTPException(
            status_code=403,
            detail=(
                "Technical Administrator "
                "access required."
            ),
        )

    return user