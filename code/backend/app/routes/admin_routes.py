from datetime import datetime, timedelta, timezone

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
    StudentToken,
    TransactionLog,
    StudentProfile,
    AuditLog,
    RevocationLog,
    WalletRecoveryRequest
)


from app.schemas import (
    TokenRequestResponse,
    ApproveTokenResponse,
    PendingStudentResponse,
    ApproveStudentResponse,
    TemporaryRevokeResponse,
    TemporaryRevokeRequest,
    AdminDashboardResponse,
    ActiveStudentTokenResponse,
    PermanentRevocationRequest,
    PermanentRevocationResponse,
    WalletReplacementRequest,
    WalletReplacementResponse
)


from app.blockchain.contract_service import (
    mint_student_token,
    student_has_token,
    get_student_token_id,
    revoke_student_temporarily,
    revoke_student_permanently,
    replace_student_wallet
)


from app.config import (
    MANAGER_ADDRESS
)


from app.utils.admin_wallet_auth import (
    get_current_admin
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ==========================================================
# HELPERS
# ==========================================================

def current_utc_time():
    return datetime.now(
        timezone.utc
    )


def convert_duration_to_seconds(
    months: int,
    days: int,
    hours: int,
    minutes: int = 0
) -> int:

    if (
        months < 0
        or days < 0
        or hours < 0
        or minutes < 0
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Months, days, hours and "
                "minutes cannot be negative."
            )
        )


    # Smart-contract prototype:
    # one month is treated as 30 days.

    total_seconds = (
        (months * 30 * 24 * 60 * 60)
        + (days * 24 * 60 * 60)
        + (hours * 60 * 60)
        + (minutes * 60)
    )


    if total_seconds <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "Revocation duration must "
                "be greater than zero."
            )
        )


    return total_seconds


def get_latest_student_token(
    db: Session,
    student_user_id: int
):

    return (
        db.query(StudentToken)
        .filter(
            StudentToken.student_user_id
            == student_user_id
        )
        .order_by(
            StudentToken.id.desc()
        )
        .first()
    )


# ==========================================================
# GET PENDING TOKEN REQUESTS
# ==========================================================

@router.get(
    "/token-requests",
    response_model=list[
        TokenRequestResponse
    ]
)
def get_pending_token_requests(
    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    requests = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.request_status
            == "pending"
        )
        .all()
    )


    return requests


# ==========================================================
# GET PENDING STUDENT REGISTRATIONS
# ==========================================================

@router.get(
    "/pending-students",
    response_model=list[
        PendingStudentResponse
    ]
)
def get_pending_students(
    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    pending_students = (
        db.query(
            User,
            StudentProfile
        )
        .join(
            StudentProfile,
            StudentProfile.user_id
            == User.id
        )
        .filter(
            User.role == "student"
        )
        .filter(
            User.status == "pending"
        )
        .all()
    )


    result = []


    for user, profile in pending_students:

        result.append({

            "user_id":
                user.id,

            "wallet_address":
                user.wallet_address,

            "status":
                user.status,

            "student_number":
                profile.student_number,

            "full_name":
                profile.full_name,

            "department":
                profile.department,

            "email":
                profile.email

        })


    return result


# ==========================================================
# APPROVE STUDENT
# ==========================================================

@router.post(
    "/approve-student/{user_id}",
    response_model=ApproveStudentResponse
)
def approve_student(
    user_id: int,

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )


    if user.role != "student":

        raise HTTPException(
            status_code=400,
            detail="User is not a student."
        )


    if user.status != "pending":

        raise HTTPException(
            status_code=400,
            detail=(
                f"Student status is "
                f"already {user.status}."
            )
        )


    try:

        user.status = "active"


        audit_log = AuditLog(

            user_id=current_admin.id,

            action="student_approved",

            description=(
                "Approved student account "
                f"for wallet "
                f"{user.wallet_address}"
            )
        )


        db.add(
            audit_log
        )

        db.commit()

        db.refresh(
            user
        )


        return {

            "message":
                "Student approved successfully",

            "user_id":
                user.id,

            "wallet_address":
                user.wallet_address,

            "status":
                user.status

        }


    except Exception as error:

        db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to approve student: "
                f"{error}"
            )
        )


# ==========================================================
# APPROVE TOKEN REQUEST AND MINT
# ==========================================================

@router.post(
    "/approve-request/{request_id}",
    response_model=ApproveTokenResponse
)
def approve_token_request(
    request_id: int,

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    token_request = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.id
            == request_id
        )
        .first()
    )


    if not token_request:

        raise HTTPException(
            status_code=404,
            detail="Token request not found."
        )


    if (
        token_request.request_status
        != "pending"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Token request is "
                "not pending."
            )
        )


    student = (
        db.query(User)
        .filter(
            User.id
            == token_request.student_user_id
        )
        .first()
    )


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student user not found."
        )


    if student.role != "student":

        raise HTTPException(
            status_code=400,
            detail="User is not a student."
        )


    if student.status != "active":

        raise HTTPException(
            status_code=403,
            detail=(
                "Student account must "
                "be active before minting."
            )
        )


    # ------------------------------------------------------
    # Database duplicate protection
    # ------------------------------------------------------

    existing_token = (
        db.query(StudentToken)
        .filter(
            StudentToken.student_user_id
            == student.id
        )
        .filter(
            StudentToken.status.in_(
                [
                    "active",
                    "temporarily_revoked",
                    "temporary_revoked"
                ]
            )
        )
        .first()
    )


    if existing_token:

        raise HTTPException(
            status_code=409,
            detail=(
                "Student already has "
                "a Digital Student ID."
            )
        )


    # ------------------------------------------------------
    # Blockchain duplicate protection
    # ------------------------------------------------------

    try:

        if student_has_token(
            token_request.wallet_address
        ):

            raise HTTPException(
                status_code=409,
                detail=(
                    "Student wallet already "
                    "owns a PeraSoul token."
                )
            )


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify blockchain "
                f"token ownership: {error}"
            )
        )


    # ------------------------------------------------------
    # Blockchain mint
    # ------------------------------------------------------

    try:

        blockchain_result = (
            mint_student_token(
                token_request.wallet_address
            )
        )


        tx_hash = (
            blockchain_result[
                "tx_hash"
            ]
        )


        token_id = (
            blockchain_result.get(
                "token_id"
            )
        )


        if token_id is None:

            token_id = (
                get_student_token_id(
                    token_request.wallet_address
                )
            )


        # --------------------------------------------------
        # Update request
        # --------------------------------------------------

        token_request.request_status = (
            "minted"
        )

        token_request.tx_hash = (
            tx_hash
        )

        token_request.reviewed_by_admin_id = (
            current_admin.id
        )

        token_request.reviewed_at = (
            current_utc_time()
        )

        token_request.review_note = (
            "Approved and minted by "
            "wallet-authenticated administrator."
        )


        # --------------------------------------------------
        # Create StudentToken
        # --------------------------------------------------

        student_token = StudentToken(

            student_user_id=
                student.id,

            wallet_address=
                token_request.wallet_address,

            token_id=
                str(token_id),

            contract_address=
                MANAGER_ADDRESS,

            network=
                "sepolia",

            status=
                "active",

            mint_tx_hash=
                tx_hash,

            issued_at=
                current_utc_time()
        )


        # --------------------------------------------------
        # Transaction log
        # --------------------------------------------------

        tx_log = TransactionLog(

            action=
                "mint_token",

            performed_by_user_id=
                current_admin.id,

            target_user_id=
                student.id,

            wallet_address=
                token_request.wallet_address,

            contract_address=
                MANAGER_ADDRESS,

            tx_hash=
                tx_hash,

            block_number=
                str(
                    blockchain_result[
                        "block_number"
                    ]
                ),

            gas_used=
                str(
                    blockchain_result[
                        "gas_used"
                    ]
                ),

            status=
                "success"
        )


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_admin.id,

            action=
                "token_minted",

            description=(
                "Minted Digital Student ID "
                f"token {token_id} for "
                f"student user {student.id}."
            )
        )


        db.add(
            student_token
        )

        db.add(
            tx_log
        )

        db.add(
            audit_log
        )


        db.commit()


        return {

            "message":
                "Token minted successfully",

            "request_id":
                token_request.id,

            "wallet_address":
                token_request.wallet_address,

            "tx_hash":
                tx_hash,

            "status":
                "minted"

        }


    except HTTPException:

        raise


    except Exception as error:

        db.rollback()


        # --------------------------------------------------
        # Record failed attempt
        # --------------------------------------------------

        try:

            token_request.request_status = (
                "failed"
            )


            tx_log = TransactionLog(

                action=
                    "mint_token",

                performed_by_user_id=
                    current_admin.id,

                target_user_id=
                    student.id,

                wallet_address=
                    token_request.wallet_address,

                contract_address=
                    MANAGER_ADDRESS,

                status=
                    "failed",

                error_message=
                    str(error)
            )


            db.add(
                tx_log
            )

            db.commit()


        except Exception:

            db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Token minting failed: "
                f"{error}"
            )
        )


# ==========================================================
# TEMPORARY REVOCATION
# ==========================================================

@router.post(
    "/temporary-revoke",
    response_model=TemporaryRevokeResponse
)
def temporary_revoke_student(
    request: TemporaryRevokeRequest,

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    wallet = (
        request.wallet_address
        .strip()
        .lower()
    )


    if not Web3.is_address(
        wallet
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address."
        )


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
            detail="Student not found."
        )


    if user.role != "student":

        raise HTTPException(
            status_code=400,
            detail="User is not a student."
        )


    if user.status != "active":

        raise HTTPException(
            status_code=403,
            detail=(
                f"User account is "
                f"{user.status}."
            )
        )


    student_token = (
        get_latest_student_token(
            db,
            user.id
        )
    )


    if not student_token:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student does not have "
                "a Digital Student ID."
            )
        )


    if (
        student_token.status
        == "permanently_revoked"
    ):

        raise HTTPException(
            status_code=409,
            detail=(
                "Permanently revoked identity "
                "cannot be temporarily revoked."
            )
        )


    duration_seconds = (
        convert_duration_to_seconds(

            request.months,

            request.days,

            request.hours,

            request.minutes
        )
    )

    try:

        if not student_has_token(
            wallet
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    "Student does not have "
                    "an active token on-chain."
                )
            )


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify token "
                f"ownership: {error}"
            )
        )

    try:

        blockchain_result = (
            revoke_student_temporarily(

                wallet,

                duration_seconds
            )
        )


        tx_hash = (
            blockchain_result[
                "tx_hash"
            ]
        )


        revoked_until = (
            current_utc_time()
            + timedelta(
                seconds=duration_seconds
            )
        )


        # --------------------------------------------------
        # Update token state
        # --------------------------------------------------

        student_token.status = (
            "temporarily_revoked"
        )


        # --------------------------------------------------
        # Revocation log
        # --------------------------------------------------

        revocation_log = RevocationLog(

            student_user_id=
                user.id,

            token_id=
                student_token.token_id,

            wallet_address=
                wallet,

            revocation_type=
                "temporary",

            reason=
                request.reason,

            duration_seconds=
                duration_seconds,

            revoked_until=
                revoked_until,

            revoked_by_admin_id=
                current_admin.id,

            tx_hash=
                tx_hash,

            status=
                "active"
        )


        # --------------------------------------------------
        # Transaction log
        # --------------------------------------------------

        tx_log = TransactionLog(

            action=
                "temporary_revoke",

            performed_by_user_id=
                current_admin.id,

            target_user_id=
                user.id,

            wallet_address=
                wallet,

            contract_address=
                MANAGER_ADDRESS,

            tx_hash=
                tx_hash,

            block_number=
                str(
                    blockchain_result[
                        "block_number"
                    ]
                ),

            gas_used=
                str(
                    blockchain_result[
                        "gas_used"
                    ]
                ),

            status=
                "success"
        )


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_admin.id,

            action=
                "temporary_revocation",

            description=(
                "Temporarily revoked "
                f"student token "
                f"{student_token.token_id}."
            )
        )


        db.add(
            revocation_log
        )

        db.add(
            tx_log
        )

        db.add(
            audit_log
        )


        db.commit()


        return {

            "message":
                "Student token temporarily revoked successfully",

            "wallet_address":
                wallet,

            "duration_seconds":
                duration_seconds,

            "tx_hash":
                tx_hash,

            "status":
                "temporarily_revoked"

        }


    except Exception as error:

        db.rollback()


        try:

            tx_log = TransactionLog(

                action=
                    "temporary_revoke",

                performed_by_user_id=
                    current_admin.id,

                target_user_id=
                    user.id,

                wallet_address=
                    wallet,

                contract_address=
                    MANAGER_ADDRESS,

                status=
                    "failed",

                error_message=
                    str(error)
            )


            db.add(
                tx_log
            )

            db.commit()


        except Exception:

            db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Temporary revocation failed: "
                f"{error}"
            )
        )


# ==========================================================
# ADMIN DASHBOARD STATISTICS
# ==========================================================

@router.get(
    "/dashboard",
    response_model=AdminDashboardResponse
)
def get_admin_dashboard(
    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    total_students = (
        db.query(User)
        .filter(
            User.role == "student"
        )
        .count()
    )


    pending_students = (
        db.query(User)
        .filter(
            User.role == "student",
            User.status == "pending"
        )
        .count()
    )


    active_students = (
        db.query(User)
        .filter(
            User.role == "student",
            User.status == "active"
        )
        .count()
    )


    suspended_students = (
        db.query(User)
        .filter(
            User.role == "student",
            User.status == "suspended"
        )
        .count()
    )


    disabled_students = (
        db.query(User)
        .filter(
            User.role == "student",
            User.status == "disabled"
        )
        .count()
    )


    pending_token_requests = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.request_status
            == "pending"
        )
        .count()
    )


    minted_tokens = (
        db.query(TokenRequest)
        .filter(
            TokenRequest.request_status
            == "minted"
        )
        .count()
    )


    active_tokens = (
        db.query(StudentToken)
        .filter(
            StudentToken.status
            == "active"
        )
        .count()
    )


    temporary_revocations = (
        db.query(RevocationLog)
        .filter(
            RevocationLog.revocation_type
            == "temporary"
        )
        .count()
    )


    permanent_revocations = (
        db.query(RevocationLog)
        .filter(
            RevocationLog.revocation_type
            == "permanent"
        )
        .count()
    )


    total_transactions = (
        db.query(
            TransactionLog
        )
        .count()
    )


    return {

        "total_students":
            total_students,

        "pending_students":
            pending_students,

        "active_students":
            active_students,

        "suspended_students":
            suspended_students,

        "disabled_students":
            disabled_students,

        "pending_token_requests":
            pending_token_requests,

        "minted_tokens":
            minted_tokens,

        "active_tokens":
            active_tokens,

        "temporary_revocations":
            temporary_revocations,

        "permanent_revocations":
            permanent_revocations,

        "total_transactions":
            total_transactions

    }


# ==========================================================
# GET ACTIVE / MANAGEABLE DIGITAL IDENTITIES
# ==========================================================

@router.get(
    "/active-tokens",
    response_model=list[
        ActiveStudentTokenResponse
    ]
)
def get_active_tokens(
    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    rows = (

        db.query(
            StudentToken,
            User,
            StudentProfile
        )

        .join(
            User,
            StudentToken.student_user_id
            == User.id
        )

        .join(
            StudentProfile,
            StudentProfile.user_id
            == User.id
        )

        .filter(
            StudentToken.status.in_(
                [
                    "active",
                    "temporarily_revoked",
                    "temporary_revoked"
                ]
            )
        )

        .order_by(
            StudentToken.id.desc()
        )

        .all()
    )


    result = []


    for token, user, profile in rows:

        result.append({

            "student_user_id":
                user.id,

            "student_number":
                profile.student_number,

            "full_name":
                profile.full_name,

            "department":
                profile.department,

            "wallet_address":
                token.wallet_address,

            "token_id":
                token.token_id,

            "token_status":
                token.status

        })


    return result


# ==========================================================
# PERMANENT REVOCATION
# ==========================================================

@router.post(
    "/revoke-permanently/{student_user_id}",
    response_model=PermanentRevocationResponse
)
def permanently_revoke_student(
    student_user_id: int,

    request: PermanentRevocationRequest,

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    student = (
        db.query(User)
        .filter(
            User.id
            == student_user_id
        )
        .first()
    )


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student was not found."
        )


    if student.role != "student":

        raise HTTPException(
            status_code=400,
            detail="User is not a student."
        )


    token = (
        get_latest_student_token(
            db,
            student_user_id
        )
    )


    if not token:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student token was not found."
            )
        )


    if (
        token.status
        == "permanently_revoked"
    ):

        raise HTTPException(
            status_code=409,
            detail=(
                "Token is already "
                "permanently revoked."
            )
        )


    if token.status == "replaced":

        raise HTTPException(
            status_code=409,
            detail=(
                "This token has already "
                "been replaced."
            )
        )


    try:

        if not student_has_token(
            token.wallet_address
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    "Student no longer owns "
                    "this token on-chain."
                )
            )


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify blockchain "
                f"ownership: {error}"
            )
        )


    try:

        result = (
            revoke_student_permanently(
                token.wallet_address
            )
        )


        tx_hash = (
            result["tx_hash"]
        )


        revoked_token_id = (
            str(
                result.get(
                    "token_id",
                    token.token_id
                )
            )
        )


        # --------------------------------------------------
        # Preserve token record for historical QR checking
        # --------------------------------------------------

        token.status = (
            "permanently_revoked"
        )

        token.burn_tx_hash = (
            tx_hash
        )

        token.revoked_at = (
            current_utc_time()
        )


        # --------------------------------------------------
        # Close temporary revocation logs if necessary
        # --------------------------------------------------

        active_temp_logs = (

            db.query(
                RevocationLog
            )

            .filter(
                RevocationLog.student_user_id
                == student_user_id,

                RevocationLog.revocation_type
                == "temporary",

                RevocationLog.status
                == "active"
            )

            .all()
        )


        for log in active_temp_logs:

            log.status = (
                "superseded"
            )


        # --------------------------------------------------
        # Permanent revocation log
        # --------------------------------------------------

        revocation_log = RevocationLog(

            student_user_id=
                student_user_id,

            token_id=
                revoked_token_id,

            wallet_address=
                token.wallet_address,

            revocation_type=
                "permanent",

            reason=
                request.reason,

            duration_seconds=
                None,

            revoked_until=
                None,

            revoked_by_admin_id=
                current_admin.id,

            tx_hash=
                tx_hash,

            status=
                "permanent"
        )


        # --------------------------------------------------
        # Transaction log
        # --------------------------------------------------

        tx_log = TransactionLog(

            action=
                "permanent_revoke",

            performed_by_user_id=
                current_admin.id,

            target_user_id=
                student_user_id,

            wallet_address=
                token.wallet_address,

            contract_address=
                MANAGER_ADDRESS,

            tx_hash=
                tx_hash,

            block_number=
                str(
                    result[
                        "block_number"
                    ]
                ),

            gas_used=
                str(
                    result[
                        "gas_used"
                    ]
                ),

            status=
                "success"
        )


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_admin.id,

            action=
                "permanent_revocation",

            description=(
                "Permanently revoked "
                f"Digital Student ID token "
                f"{revoked_token_id} for "
                f"student user "
                f"{student_user_id}."
            )
        )


        db.add(
            revocation_log
        )

        db.add(
            tx_log
        )

        db.add(
            audit_log
        )


        db.commit()

        db.refresh(
            token
        )


        return {

            "message":
                "Student identity permanently revoked.",

            "student_user_id":
                student_user_id,

            "token_id":
                revoked_token_id,

            "tx_hash":
                tx_hash,

            "block_number":
                result[
                    "block_number"
                ],

            "gas_used":
                result[
                    "gas_used"
                ],

            "reason":
                request.reason

        }


    except HTTPException:

        raise


    except Exception as error:

        db.rollback()


        try:

            failed_tx = TransactionLog(

                action=
                    "permanent_revoke",

                performed_by_user_id=
                    current_admin.id,

                target_user_id=
                    student_user_id,

                wallet_address=
                    token.wallet_address,

                contract_address=
                    MANAGER_ADDRESS,

                status=
                    "failed",

                error_message=
                    str(error)
            )


            db.add(
                failed_tx
            )

            db.commit()


        except Exception:

            db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Permanent revocation failed: "
                f"{error}"
            )
        )


# ==========================================================
# WALLET REPLACEMENT
# ==========================================================

@router.post(
    "/replace-wallet/{student_user_id}",
    response_model=WalletReplacementResponse
)
def replace_wallet(
    student_user_id: int,

    request: WalletReplacementRequest,

    db: Session = Depends(get_db),

    current_admin: User = Depends(
        get_current_admin
    )
):

    # ------------------------------------------------------
    # Validate new wallet
    # ------------------------------------------------------

    if not Web3.is_address(
        request.new_wallet
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid new Ethereum "
                "wallet address."
            )
        )


    new_wallet = (
        request.new_wallet
        .strip()
        .lower()
    )


    # ------------------------------------------------------
    # Find student
    # ------------------------------------------------------

    student = (
        db.query(User)
        .filter(
            User.id
            == student_user_id
        )
        .first()
    )


    if not student:

        raise HTTPException(
            status_code=404,
            detail="Student was not found."
        )


    if student.role != "student":

        raise HTTPException(
            status_code=400,
            detail="User is not a student."
        )


    old_wallet = (
        student.wallet_address
    )


    if (
        new_wallet
        == old_wallet.lower()
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New wallet cannot be "
                "the same as the old wallet."
            )
        )


    # ------------------------------------------------------
    # Ensure new wallet does not belong to another user
    # ------------------------------------------------------

    existing_user = (

        db.query(User)

        .filter(
            User.wallet_address
            == new_wallet
        )

        .first()
    )


    if existing_user:

        raise HTTPException(
            status_code=409,
            detail=(
                "The new wallet is already "
                "registered in PeraSoul."
            )
        )


    # ------------------------------------------------------
    # Get current token
    # ------------------------------------------------------

    old_token = (
        get_latest_student_token(
            db,
            student_user_id
        )
    )


    if not old_token:

        raise HTTPException(
            status_code=404,
            detail=(
                "Student does not have "
                "a Digital Student ID."
            )
        )


    # For the prototype, do not allow wallet replacement
    # to bypass a revocation.

    if old_token.status in [
        "temporarily_revoked",
        "temporary_revoked"
    ]:

        raise HTTPException(
            status_code=409,
            detail=(
                "Wallet replacement cannot "
                "be performed while the "
                "identity is temporarily revoked."
            )
        )


    if old_token.status in [
        "permanently_revoked",
        "revoked"
    ]:

        raise HTTPException(
            status_code=409,
            detail=(
                "A permanently revoked identity "
                "cannot be moved to a new wallet."
            )
        )


    if old_token.status == "replaced":

        raise HTTPException(
            status_code=409,
            detail=(
                "The current token has "
                "already been replaced."
            )
        )


    # ------------------------------------------------------
    # Validate blockchain state
    # ------------------------------------------------------

    try:

        if not student_has_token(
            old_wallet
        ):

            raise HTTPException(
                status_code=404,
                detail=(
                    "Old wallet does not own "
                    "a PeraSoul token."
                )
            )


        if student_has_token(
            new_wallet
        ):

            raise HTTPException(
                status_code=409,
                detail=(
                    "New wallet already owns "
                    "a PeraSoul token."
                )
            )


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to validate wallet "
                f"state on blockchain: {error}"
            )
        )


    # ------------------------------------------------------
    # Blockchain wallet replacement
    # ------------------------------------------------------

    try:

        result = (
            replace_student_wallet(
                old_wallet,
                new_wallet
            )
        )


        tx_hash = (
            result[
                "tx_hash"
            ]
        )


        old_token_id = (
            str(
                result.get(
                    "old_token_id",
                    old_token.token_id
                )
            )
        )


        new_token_id = (
            str(
                result[
                    "new_token_id"
                ]
            )
        )


        now = (
            current_utc_time()
        )


        # --------------------------------------------------
        # Preserve old token record
        # --------------------------------------------------

        old_token.status = (
            "replaced"
        )

        old_token.burn_tx_hash = (
            tx_hash
        )

        old_token.revoked_at = (
            now
        )


        # --------------------------------------------------
        # Create new token record
        # --------------------------------------------------

        new_token = StudentToken(

            student_user_id=
                student.id,

            wallet_address=
                new_wallet,

            token_id=
                new_token_id,

            contract_address=
                old_token.contract_address,

            network=
                old_token.network
                or "sepolia",

            status=
                "active",

            mint_tx_hash=
                tx_hash,

            issued_at=
                now
        )


        # --------------------------------------------------
        # Update student login wallet
        # --------------------------------------------------

        student.wallet_address = (
            new_wallet
        )


        # Old login signatures/nonces must not remain valid.

        student.login_nonce = (
            None
        )


        # --------------------------------------------------
        # Wallet recovery/replacement record
        # --------------------------------------------------

        recovery_record = (
            WalletRecoveryRequest(

                student_user_id=
                    student.id,

                old_wallet_address=
                    old_wallet,

                new_wallet_address=
                    new_wallet,

                reason=
                    request.reason,

                status=
                    "approved",

                reviewed_by_admin_id=
                    current_admin.id,

                review_note=(
                    "Wallet replacement "
                    "approved and executed."
                ),

                tx_hash=
                    tx_hash,

                reviewed_at=
                    now
            )
        )


        # --------------------------------------------------
        # Transaction log
        # --------------------------------------------------

        tx_log = TransactionLog(

            action=
                "replace_wallet",

            performed_by_user_id=
                current_admin.id,

            target_user_id=
                student.id,

            wallet_address=
                new_wallet,

            contract_address=
                MANAGER_ADDRESS,

            tx_hash=
                tx_hash,

            block_number=
                str(
                    result[
                        "block_number"
                    ]
                ),

            gas_used=
                str(
                    result[
                        "gas_used"
                    ]
                ),

            status=
                "success"
        )


        # --------------------------------------------------
        # Audit log
        # --------------------------------------------------

        audit_log = AuditLog(

            user_id=
                current_admin.id,

            action=
                "wallet_replacement",

            description=(
                "Replaced student wallet "
                f"{old_wallet} with "
                f"{new_wallet}. "
                f"Old token {old_token_id}; "
                f"new token {new_token_id}."
            )
        )


        db.add(
            new_token
        )

        db.add(
            recovery_record
        )

        db.add(
            tx_log
        )

        db.add(
            audit_log
        )


        db.commit()


        return {

            "message":
                "Student wallet replaced successfully.",

            "old_wallet":
                old_wallet,

            "new_wallet":
                new_wallet,

            "old_token_id":
                old_token_id,

            "new_token_id":
                new_token_id,

            "tx_hash":
                tx_hash

        }


    except HTTPException:

        raise


    except Exception as error:

        db.rollback()


        try:

            failed_recovery = (
                WalletRecoveryRequest(

                    student_user_id=
                        student.id,

                    old_wallet_address=
                        old_wallet,

                    new_wallet_address=
                        new_wallet,

                    reason=
                        request.reason,

                    status=
                        "failed",

                    reviewed_by_admin_id=
                        current_admin.id,

                    review_note=
                        str(error)
                )
            )


            failed_tx = TransactionLog(

                action=
                    "replace_wallet",

                performed_by_user_id=
                    current_admin.id,

                target_user_id=
                    student.id,

                wallet_address=
                    old_wallet,

                contract_address=
                    MANAGER_ADDRESS,

                status=
                    "failed",

                error_message=
                    str(error)
            )


            db.add(
                failed_recovery
            )

            db.add(
                failed_tx
            )

            db.commit()


        except Exception:

            db.rollback()


        raise HTTPException(
            status_code=500,
            detail=(
                "Wallet replacement failed: "
                f"{error}"
            )
        )