import secrets

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from jose import (
    JWTError,
    jwt,
)

from jose.exceptions import (
    ExpiredSignatureError,
)

from sqlalchemy.orm import Session


from app.database import get_db

from app.models import (
    User,
    StudentProfile,
    StudentToken,
)

from app.config import (
    SECRET_KEY,
    ALGORITHM,
)

from app.blockchain.contract_service import (
    verify_student_on_chain,
    get_remaining_revocation_time,
)

from app.schemas import (
    VerifyStudentResponse,
)


# ==========================================================
# ROUTER
# ==========================================================

router = APIRouter(
    tags=["Verification"]
)


# ==========================================================
# QR CONFIGURATION
# ==========================================================

QR_VALIDITY_SECONDS = 10

QR_PURPOSE = (
    "perasoul_public_identity_verification"
)


# ==========================================================
# BASIC WALLET VALIDATION
# ==========================================================

def is_valid_wallet_address(
    wallet_address: str
) -> bool:

    return (
        wallet_address.startswith("0x")
        and len(wallet_address) == 42
    )


# ==========================================================
# REQUIRE SIGNING SECRET
# ==========================================================

def require_secret_key():

    if not SECRET_KEY:

        raise HTTPException(
            status_code=500,
            detail=(
                "QR signing secret is not configured."
            ),
        )


# ==========================================================
# FIND TOKEN
# ==========================================================

def get_token_record(
    db: Session,
    token_id: str,
):

    clean_token_id = (
        str(token_id)
        .strip()
    )


    if (
        not clean_token_id
        or not clean_token_id.isdigit()
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid token ID.",
        )


    token = (
        db.query(StudentToken)
        .filter(
            StudentToken.token_id
            == clean_token_id
        )
        .order_by(
            StudentToken.id.desc()
        )
        .first()
    )


    if not token:

        raise HTTPException(
            status_code=404,
            detail=(
                "Digital Student ID "
                "token was not found."
            ),
        )


    return token


# ==========================================================
# GET STUDENT INFORMATION FOR TOKEN
# ==========================================================

def get_student_information(
    db: Session,
    token: StudentToken,
):

    user = (
        db.query(User)
        .filter(
            User.id
            == token.student_user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student account was not found."
            ),
        )


    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.user_id
            == user.id
        )
        .first()
    )


    if not profile:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student profile was not found."
            ),
        )


    return user, profile


# ==========================================================
# BUILD CURRENT PUBLIC VERIFICATION RESULT
# ==========================================================

def build_public_verification(
    db: Session,
    token_id: str,
):

    token = get_token_record(
        db,
        token_id,
    )


    user, profile = (
        get_student_information(
            db,
            token,
        )
    )


    wallet = (
        token.wallet_address
        .strip()
        .lower()
    )


    database_status = (
        str(
            token.status
            or ""
        )
        .strip()
        .lower()
    )


    remaining_seconds = 0

    is_valid = False

    public_status = "INVALID"


    # ------------------------------------------------------
    # Permanently revoked identity
    # ------------------------------------------------------

    if database_status in {
        "permanently_revoked",
        "revoked",
    }:

        public_status = (
            "PERMANENTLY_REVOKED"
        )

        is_valid = False


    # ------------------------------------------------------
    # Replaced wallet/token
    # ------------------------------------------------------

    elif database_status == "replaced":

        public_status = "REPLACED"

        is_valid = False


    # ------------------------------------------------------
    # Active / temporary status must be checked on-chain
    # ------------------------------------------------------

    else:

        try:

            remaining_seconds = int(
                get_remaining_revocation_time(
                    wallet
                )
                or 0
            )


            is_valid = bool(
                verify_student_on_chain(
                    wallet
                )
            )


        except Exception as error:

            raise HTTPException(
                status_code=503,
                detail=(
                    "Unable to check the current "
                    "blockchain identity status: "
                    f"{error}"
                ),
            )


        # --------------------------------------------------
        # Temporarily revoked
        # --------------------------------------------------

        if remaining_seconds > 0:

            public_status = (
                "TEMPORARILY_REVOKED"
            )

            is_valid = False


        # --------------------------------------------------
        # Valid active identity
        # --------------------------------------------------

        elif is_valid:

            public_status = "ACTIVE"


        # --------------------------------------------------
        # Blockchain says invalid
        # --------------------------------------------------

        else:

            public_status = "INVALID"


    return {

        "verified":
            is_valid,

        "status":
            public_status,

        "full_name":
            profile.full_name,

        "student_number":
            profile.student_number,

        "department":
            profile.department,

        "token_id":
            str(token.token_id),

        "wallet_address":
            wallet,

        "network":
            token.network
            or "sepolia",

        "remaining_seconds":
            remaining_seconds,
    }


# ==========================================================
# EXISTING WALLET-BASED VERIFICATION
# ==========================================================

@router.get(
    "/verify/{wallet_address}",
    response_model=VerifyStudentResponse,
)
def verify_student(
    wallet_address: str
):

    wallet = (
        wallet_address
        .strip()
        .lower()
    )


    if not is_valid_wallet_address(
        wallet
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address",
        )


    try:

        is_valid = (
            verify_student_on_chain(
                wallet
            )
        )


        remaining_time = (
            get_remaining_revocation_time(
                wallet
            )
        )


    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify identity "
                f"on Ethereum Sepolia: {error}"
            ),
        )


    return {

        "wallet_address":
            wallet,

        "is_valid":
            is_valid,

        "remaining_revocation_time":
            remaining_time,
    }


# ==========================================================
# NORMAL PUBLIC TOKEN VERIFICATION
# ==========================================================

@router.get(
    "/public/verify/{token_id}"
)
def verify_public_token(
    token_id: str,

    db: Session = Depends(
        get_db
    ),
):

    return build_public_verification(
        db,
        token_id,
    )


# ==========================================================
# CREATE 10-SECOND SIGNED QR SESSION
# ==========================================================

@router.get(
    "/public/qr-session/{token_id}"
)
def create_qr_session(
    token_id: str,

    db: Session = Depends(
        get_db
    ),
):

    require_secret_key()


    # ------------------------------------------------------
    # Confirm that this token actually exists.
    # ------------------------------------------------------

    token = get_token_record(
        db,
        token_id,
    )


    # ------------------------------------------------------
    # Use canonical stored token ID.
    # ------------------------------------------------------

    canonical_token_id = (
        str(token.token_id)
    )


    now = datetime.now(
        timezone.utc
    )


    expires_at = (
        now
        + timedelta(
            seconds=QR_VALIDITY_SECONDS
        )
    )


    # ------------------------------------------------------
    # Random ID makes every generated QR different,
    # even for the same student/token.
    # ------------------------------------------------------

    qr_id = (
        secrets.token_urlsafe(12)
    )


    payload = {

        "sub":
            canonical_token_id,

        "token_id":
            canonical_token_id,

        "purpose":
            QR_PURPOSE,

        "jti":
            qr_id,

        "iat":
            int(
                now.timestamp()
            ),

        "exp":
            int(
                expires_at.timestamp()
            ),
    }


    qr_token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


    return {

        "token_id":
            canonical_token_id,

        "qr_token":
            qr_token,

        "expires_in":
            QR_VALIDITY_SECONDS,

        "expires_at":
            int(
                expires_at.timestamp()
            ),

        "qr_id":
            qr_id,
    }


# ==========================================================
# VERIFY SIGNED QR SESSION
# ==========================================================

@router.get(
    "/public/verify-qr/{qr_token}"
)
def verify_qr_session(
    qr_token: str,

    db: Session = Depends(
        get_db
    ),
):

    require_secret_key()


    # ------------------------------------------------------
    # Validate signature + expiry
    # ------------------------------------------------------

    try:

        payload = jwt.decode(
            qr_token,
            SECRET_KEY,
            algorithms=[
                ALGORITHM
            ],
        )


    except ExpiredSignatureError:

        raise HTTPException(
            status_code=410,
            detail=(
                "QR verification code has expired. "
                "Ask the student to display "
                "a new QR code."
            ),
        )


    except JWTError:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid QR verification code."
            ),
        )


    # ------------------------------------------------------
    # Ensure this JWT was actually issued for QR use.
    # ------------------------------------------------------

    purpose = payload.get(
        "purpose"
    )


    if purpose != QR_PURPOSE:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid QR verification purpose."
            ),
        )


    token_id = (
        payload.get("token_id")
        or payload.get("sub")
    )


    if not token_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "QR verification code "
                "does not contain a token ID."
            ),
        )


    # ------------------------------------------------------
    # IMPORTANT:
    #
    # QR validity only proves that the QR code itself
    # is fresh. We still retrieve the CURRENT identity
    # state from the database + Ethereum Sepolia.
    # ------------------------------------------------------

    result = (
        build_public_verification(
            db,
            str(token_id),
        )
    )


    result.update({

        "qr_verified":
            True,

        "qr_id":
            payload.get("jti"),

        "qr_issued_at":
            payload.get("iat"),

        "qr_expires_at":
            payload.get("exp"),
    })


    return result