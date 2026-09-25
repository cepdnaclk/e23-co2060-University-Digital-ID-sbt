from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from web3 import Web3


from app.database import get_db


from app.models import (
    User,
    TokenRequest,
    StudentProfile,
    StudentToken,
    TransactionLog
)


from app.schemas import (
    TokenRequestCreate,
    TokenRequestResponse,
    StudentDashboardResponse
)


from app.blockchain.contract_service import (
    verify_student_on_chain,
    get_remaining_revocation_time,
    student_has_token
)


router = APIRouter(
    prefix="/student",
    tags=["Student"]
)


# ==========================================================
# WALLET VALIDATION
# ==========================================================

def is_valid_wallet_address(
    wallet_address: str
) -> bool:

    return Web3.is_address(
        wallet_address
    )


# ==========================================================
# FORMAT REVOCATION TIME
# ==========================================================

def format_remaining_time(
    seconds: int
):

    if seconds <= 0:

        return {
            "months": 0,
            "days": 0,
            "hours": 0,
            "minutes": 0
        }


    months = (
        seconds
        // (30 * 24 * 60 * 60)
    )

    seconds %= (
        30 * 24 * 60 * 60
    )


    days = (
        seconds
        // (24 * 60 * 60)
    )

    seconds %= (
        24 * 60 * 60
    )


    hours = (
        seconds
        // (60 * 60)
    )

    seconds %= (
        60 * 60
    )


    minutes = (
        seconds // 60
    )


    return {
        "months": months,
        "days": days,
        "hours": hours,
        "minutes": minutes
    }


# ==========================================================
# REQUEST DIGITAL STUDENT ID
# ==========================================================

@router.post(
    "/request-token",
    response_model=TokenRequestResponse
)
def request_token(
    request: TokenRequestCreate,
    db: Session = Depends(get_db)
):

    wallet = (
        request.wallet_address
        .strip()
        .lower()
    )


    # ------------------------------------------------------
    # Validate wallet
    # ------------------------------------------------------

    if not is_valid_wallet_address(
        wallet
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address"
        )


    # ------------------------------------------------------
    # Find registered user
    # ------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.wallet_address
            == wallet
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="Wallet is not registered"
        )


    if user.role != "student":

        raise HTTPException(
            status_code=403,
            detail=(
                "Only students can "
                "request Digital Student IDs."
            )
        )


    # ------------------------------------------------------
    # Account must be approved
    # ------------------------------------------------------

    if user.status != "active":

        raise HTTPException(
            status_code=403,
            detail=(
                f"User account is {user.status}. "
                "Only active students can request tokens."
            )
        )


    # ------------------------------------------------------
    # Existing pending request
    # ------------------------------------------------------

    existing_pending = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.student_user_id
            == user.id,

            TokenRequest.request_status
            == "pending"
        )
        .first()
    )


    if existing_pending:

        raise HTTPException(
            status_code=409,
            detail=(
                "A Digital Student ID "
                "request is already pending."
            )
        )


    # ------------------------------------------------------
    # Existing minted request
    # ------------------------------------------------------

    existing_minted_request = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.student_user_id
            == user.id,

            TokenRequest.request_status
            == "minted"
        )
        .first()
    )


    if existing_minted_request:

        raise HTTPException(
            status_code=409,
            detail=(
                "A Digital Student ID has already "
                "been issued for this student."
            )
        )


    # ------------------------------------------------------
    # Existing application token record
    # ------------------------------------------------------

    existing_token = (
        db.query(StudentToken)
        .filter(
            StudentToken.student_user_id
            == user.id
        )
        .order_by(
            StudentToken.id.desc()
        )
        .first()
    )


    if existing_token:

        normalized_status = (
            existing_token.status
            or ""
        ).lower()


        if normalized_status in [
            "active",
            "temporarily_revoked",
            "temporary_revoked",
            "permanently_revoked",
            "revoked"
        ]:

            raise HTTPException(
                status_code=409,
                detail=(
                    "This student already has "
                    "a Digital Student ID record."
                )
            )


    # ------------------------------------------------------
    # Check blockchain ownership
    # ------------------------------------------------------

    try:

        if student_has_token(
            wallet
        ):

            raise HTTPException(
                status_code=409,
                detail=(
                    "This wallet already owns "
                    "a PeraSoul Digital Student ID."
                )
            )


    except HTTPException:

        raise


    except Exception as error:

        # Do not incorrectly create a positive ownership result.
        # Log the RPC warning for debugging.
        print(
            "Blockchain ownership check warning:",
            error
        )


    # ------------------------------------------------------
    # Create request
    # ------------------------------------------------------

    token_request = TokenRequest(

        student_user_id=user.id,

        wallet_address=wallet,

        request_status="pending",

        request_note=(
            request.request_note
            or
            "Requesting Digital Student ID token"
        )
    )


    try:

        db.add(
            token_request
        )

        db.commit()

        db.refresh(
            token_request
        )


        return token_request


    except Exception as error:

        db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create token request: "
                f"{error}"
            )
        )


# ==========================================================
# STUDENT DASHBOARD
# ==========================================================

@router.get(
    "/dashboard/{wallet_address}",
    response_model=StudentDashboardResponse
)
def get_student_dashboard(
    wallet_address: str,
    db: Session = Depends(get_db)
):

    wallet = (
        wallet_address
        .strip()
        .lower()
    )


    # ------------------------------------------------------
    # Validate wallet
    # ------------------------------------------------------

    if not is_valid_wallet_address(
        wallet
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address"
        )


    # ------------------------------------------------------
    # Find student
    # ------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.wallet_address
            == wallet
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )


    if user.role != "student":

        raise HTTPException(
            status_code=403,
            detail="User is not a student"
        )


    # ------------------------------------------------------
    # Student profile
    # ------------------------------------------------------

    profile = (
        db.query(StudentProfile)
        .filter(
            StudentProfile.user_id
            == user.id
        )
        .first()
    )


    # ------------------------------------------------------
    # Latest token request
    # ------------------------------------------------------

    latest_request = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.student_user_id
            == user.id
        )
        .order_by(
            TokenRequest.id.desc()
        )
        .first()
    )


    # ------------------------------------------------------
    # Latest token record
    # ------------------------------------------------------

    student_token = (
        db.query(StudentToken)
        .filter(
            StudentToken.student_user_id
            == user.id
        )
        .order_by(
            StudentToken.id.desc()
        )
        .first()
    )


    # ------------------------------------------------------
    # Latest blockchain transaction
    # ------------------------------------------------------

    latest_tx = (
        db.query(TransactionLog)
        .filter(
            TransactionLog.target_user_id
            == user.id
        )
        .order_by(
            TransactionLog.id.desc()
        )
        .first()
    )


    # ======================================================
    # TOKEN DATA
    # ======================================================

    token_id = None

    token_status = None

    network = "sepolia"


    if student_token:

        token_id = (
            student_token.token_id
        )

        token_status = (
            student_token.status
        )

        network = (
            student_token.network
            or "sepolia"
        )


    normalized_token_status = (

        token_status.lower()

        if token_status

        else None
    )


    # ======================================================
    # BLOCKCHAIN VALIDITY
    # ======================================================

    is_valid = False

    remaining_seconds = 0


    formatted_time = {

        "months": 0,

        "days": 0,

        "hours": 0,

        "minutes": 0

    }


    # ------------------------------------------------------
    # Permanently revoked identity
    # ------------------------------------------------------

    if normalized_token_status in [
        "permanently_revoked",
        "revoked"
    ]:

        is_valid = False

        remaining_seconds = 0


    # ------------------------------------------------------
    # Existing token
    # ------------------------------------------------------

    elif student_token:

        try:

            is_valid = (
                verify_student_on_chain(
                    wallet
                )
            )


        except Exception as error:

            print(
                "Blockchain verification error:",
                error
            )

            is_valid = False


        # --------------------------------------------------
        # Temporary revocation time
        # --------------------------------------------------

        try:

            if student_has_token(
                wallet
            ):

                remaining_seconds = (
                    get_remaining_revocation_time(
                        wallet
                    )
                )


                formatted_time = (
                    format_remaining_time(
                        remaining_seconds
                    )
                )


        except Exception as error:

            print(
                "Revocation time error:",
                error
            )

            remaining_seconds = 0


    # ======================================================
    # EFFECTIVE TOKEN STATUS
    # ======================================================

    effective_token_status = (
        token_status
    )


    # Blockchain still has an active temporary revocation.

    if (
        student_token
        and remaining_seconds > 0
        and normalized_token_status
        not in [
            "permanently_revoked",
            "revoked"
        ]
    ):

        effective_token_status = (
            "temporarily_revoked"
        )


    # Temporary revocation has expired.

    elif (
        normalized_token_status
        in [
            "temporarily_revoked",
            "temporary_revoked"
        ]
        and remaining_seconds <= 0
        and is_valid
    ):

        effective_token_status = (
            "active"
        )


    # ======================================================
    # RESPONSE
    # ======================================================

    return {

        "wallet_address":
            wallet,


        "full_name":
            (
                profile.full_name
                if profile
                else None
            ),


        "student_number":
            (
                profile.student_number
                if profile
                else None
            ),


        "faculty":
            (
                profile.faculty
                if profile
                else None
            ),


        "department":
            (
                profile.department
                if profile
                else None
            ),


        "batch":
            (
                profile.batch
                if profile
                else None
            ),


        "academic_year":
            (
                profile.academic_year
                if profile
                else None
            ),


        "account_status":
            user.status,


        "token_request_status":
            (
                latest_request.request_status
                if latest_request
                else None
            ),


        "token_id":
            token_id,


        "token_status":
            effective_token_status,


        "network":
            network,


        "latest_tx_hash":
            (
                latest_tx.tx_hash
                if latest_tx
                else None
            ),


        "is_valid_on_chain":
            is_valid,


        "remaining_revocation_seconds":
            remaining_seconds,


        "remaining_revocation_time":
            formatted_time

    }