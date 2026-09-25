import secrets

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from eth_account import Account
from eth_account.messages import encode_defunct

from app.database import get_db

from app.models import (
    User,
    AdminProfile,
)

from app.schemas import (
    AdminWalletNonceRequest,
    AdminWalletNonceResponse,
    AdminWalletVerifyRequest,
    AdminWalletVerifyResponse,
    AdminWalletSessionResponse,
)

from app.utils.admin_wallet_auth import (
    ADMIN_ROLES,
    create_admin_access_token,
    get_current_staff,
)


router = APIRouter(
    prefix="/admin-auth",
    tags=["Administrator Authentication"],
)


# ==========================================================
# WALLET VALIDATION
# ==========================================================

def is_valid_wallet_address(
    wallet_address: str,
) -> bool:

    return (
        isinstance(wallet_address, str)
        and wallet_address.startswith("0x")
        and len(wallet_address) == 42
    )


# ==========================================================
# ADMIN PROFILE DISPLAY NAME
# ==========================================================

def get_admin_display_name(
    db: Session,
    user_id: int,
) -> str:

    profile = (
        db.query(AdminProfile)
        .filter(
            AdminProfile.user_id == user_id
        )
        .first()
    )

    if (
        profile
        and profile.full_name
    ):
        return profile.full_name

    return "PeraSoul Administrator"


# ==========================================================
# REQUEST ADMIN LOGIN NONCE
#
# Supports:
# - university_admin
# - technical_admin
# ==========================================================

@router.post(
    "/nonce",
    response_model=AdminWalletNonceResponse,
)
def generate_admin_nonce(
    request: AdminWalletNonceRequest,
    db: Session = Depends(get_db),
):

    wallet = (
        request.wallet_address
        .strip()
        .lower()
    )

    if not is_valid_wallet_address(
        wallet
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address.",
        )

    user = (
        db.query(User)
        .filter(
            User.wallet_address == wallet
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail=(
                "Administrator wallet "
                "is not registered."
            ),
        )

    if user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail=(
                "This wallet does not have "
                "administrator access."
            ),
        )

    if user.status != "active":
        raise HTTPException(
            status_code=403,
            detail=(
                "Administrator account "
                "is inactive."
            ),
        )

    nonce = secrets.token_hex(16)

    message = (
        "Login to PeraSoul Administration Portal.\n\n"
        f"Wallet: {wallet}\n"
        f"Nonce: {nonce}\n\n"
        "Signing this message proves ownership "
        "of the connected wallet.\n"
        "This does not create a blockchain "
        "transaction and does not cost gas."
    )

    user.login_nonce = message

    db.commit()

    return {
        "wallet_address": wallet,
        "message": message,
    }


# ==========================================================
# VERIFY ADMIN WALLET SIGNATURE
#
# Supports:
# - university_admin
# - technical_admin
# ==========================================================

@router.post(
    "/verify-signature",
    response_model=AdminWalletVerifyResponse,
)
def verify_admin_signature(
    request: AdminWalletVerifyRequest,
    db: Session = Depends(get_db),
):

    wallet = (
        request.wallet_address
        .strip()
        .lower()
    )

    if not is_valid_wallet_address(
        wallet
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address.",
        )

    user = (
        db.query(User)
        .filter(
            User.wallet_address == wallet
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail=(
                "Administrator wallet "
                "is not registered."
            ),
        )

    if user.role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail=(
                "Administrative access required."
            ),
        )

    if user.status != "active":
        raise HTTPException(
            status_code=403,
            detail=(
                "Administrator account "
                "is inactive."
            ),
        )

    if not user.login_nonce:
        raise HTTPException(
            status_code=400,
            detail=(
                "No administrator login "
                "nonce found. "
                "Request a new nonce first."
            ),
        )

    try:

        encoded_message = (
            encode_defunct(
                text=user.login_nonce
            )
        )

        recovered_address = (
            Account.recover_message(
                encoded_message,
                signature=request.signature,
            )
            .lower()
        )

    except Exception:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid administrator signature."
            ),
        )

    if recovered_address != wallet:
        raise HTTPException(
            status_code=401,
            detail=(
                "Administrator signature "
                "verification failed."
            ),
        )

    # ------------------------------------------------------
    # Replay protection
    # ------------------------------------------------------

    user.login_nonce = None

    db.commit()

    # ------------------------------------------------------
    # Generate JWT
    # ------------------------------------------------------

    access_token = (
        create_admin_access_token(
            user
        )
    )

    display_name = (
        get_admin_display_name(
            db,
            user.id,
        )
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin_id": user.id,
        "wallet_address":
            user.wallet_address,
        "role": user.role,
        "display_name":
            display_name,
    }


# ==========================================================
# CURRENT ADMINISTRATIVE SESSION
#
# Supports:
# - university_admin
# - technical_admin
# ==========================================================

@router.get(
    "/me",
    response_model=AdminWalletSessionResponse,
)
def get_admin_session(

    current_admin:
        User = Depends(
            get_current_staff
        ),

    db: Session = Depends(
        get_db
    ),
):

    display_name = (
        get_admin_display_name(
            db,
            current_admin.id,
        )
    )

    return {
        "id":
            current_admin.id,

        "wallet_address":
            current_admin.wallet_address,

        "role":
            current_admin.role,

        "status":
            current_admin.status,

        "display_name":
            display_name,
    }