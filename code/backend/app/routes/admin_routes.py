from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta 

from app.database import get_db 
from app.models import User, TokenRequest, StudentToken, TransactionLog, StudentProfile, AuditLog, RevocationLog
from app.schemas import TokenRequestResponse, ApproveTokenResponse, PendingStudentResponse, ApproveStudentResponse, TemporaryRevokeResponse, TemporaryRevokeRequest, AdminDashboardResponse 
from app.blockchain.contract_service import mint_student_token, verify_student_on_chain, revoke_student_temporarily, get_remaining_revocation_time
from app.config import MANAGER_ADDRESS 

router = APIRouter(prefix="/admin", tags=["Admin"])

def convert_duration_to_seconds(months: int, days: int, hours: int, minutes: int = 0) -> int:
    if months < 0 or days < 0 or hours < 0 or minutes < 0:
        raise HTTPException (
            status_code = 400,
            detail = "Months, days, hours and minutes cannot be negative"
        )
    
    #For smart contract usage, treat 1 month as 30 days 
    total_seconds = (
        (months * 30 *  24 * 60 * 60) +
        (days * 24 * 60 * 60) +
        (hours * 60 * 60 ) +
        (minutes * 60)
    )

    if total_seconds <= 0:
        raise HTTPException (
            status_code = 400,
            detail = "Revocation duration must be greater than 0"
        )
    
    return total_seconds

@router.get ("/token-requests", response_model=list[TokenRequestResponse])
def get_pending_token_requests(db: Session = Depends(get_db)):
    requests = db.query(TokenRequest).filter(
        TokenRequest.request_status == "pending"
    ).all() 

    return requests 

@router.get("/pending-students", response_model=list[PendingStudentResponse])
def get_pending_students(db: Session = Depends(get_db)):
    pending_students = (
        db.query(User, StudentProfile)
        .join(StudentProfile, StudentProfile.user_id == User.id)
        .filter(User.role == "student")
        .filter(User.status == "pending")
        .all()
    )

    result = []

    for user, profile in pending_students:
        result.append({
            "user_id": user.id,
            "wallet_address": user.wallet_address,
            "status": user.status,
            "student_number": profile.student_number,
            "full_name": profile.full_name,
            "department": profile.department,
            "email": profile.email
        })

    return result


@router.post("/approve-student/{user_id}", response_model=ApproveStudentResponse)
def approve_student(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    if user.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    if user.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Student status is already {user.status}"
        )

    user.status = "active"

    audit_log = AuditLog(
        user_id=user.id,
        action="student_approved",
        description=f"Student account approved for wallet {user.wallet_address}"
    )

    db.add(audit_log)
    db.commit()
    db.refresh(user)

    return {
        "message": "Student approved successfully",
        "user_id": user.id,
        "wallet_address": user.wallet_address,
        "status": user.status
    }

@router.post("/approve-request/{request_id}", response_model = ApproveTokenResponse)
def approve_token_request(
    request_id: int,
    db: Session = Depends (get_db)
):
    token_request = db.query(TokenRequest).filter (
        TokenRequest.id == request_id
    ).first()

    if not token_request:
        raise HTTPException (
            status_code=404,
            detail = "Token request not found"
        )
    
    if token_request.request_status != "pending":
        raise HTTPException (
            status_code = 400,
            detail = "Request is not pending"
        )
    
    student = db.query(User).filter (
        User.id == token_request.student_user_id
    ).first() 

    if not student:
        raise HTTPException (
            status_code = 404,
            detail = "Student user not found"
        )
    
    if verify_student_on_chain(token_request.wallet_address):
        raise HTTPException (
            status_code = 400,
            detail = "Student already has an active Soulbound Token"
        )
    
    try:
        blockchain_result = mint_student_token(token_request.wallet_address)

        tx_hash = blockchain_result["tx_hash"]

        token_request.request_status = "minted"
        token_request.tx_hash = tx_hash
        token_request.reviewed_at = datetime.utcnow()

        student_token = StudentToken(
            student_user_id = student.id,
            wallet_address = token_request.wallet_address,
            contract_address = MANAGER_ADDRESS,
            network = "sepolia",
            status = "active",
            mint_tx_hash = tx_hash,
            issued_at = datetime.utcnow()
        )

        tx_log = TransactionLog (
            action = "mint_token",
            performed_by_user_id = None,
            target_user_id = student.id,
            wallet_address = token_request.wallet_address,
            contract_address = MANAGER_ADDRESS,
            tx_hash = tx_hash,
            block_number = str(blockchain_result["block_number"]),
            gas_used = str(blockchain_result["gas_used"]),
            status = "success"
        )

        db.add(student_token)
        db.add(tx_log)
        db.commit()

        return {
            "message": "Token minted successfully",
            "request_id": token_request.id,
            "wallet_address": token_request.wallet_address,
            "tx_hash": tx_hash,
            "status": "minted"
        }
    
    except Exception as e:
        token_request.request_status = "failed"

        tx_log = TransactionLog(
            action = "mint_token",
            performed_by_user_id = None,
            target_user_id = student.id,
            wallet_address = token_request.wallet_address,
            contract_address = MANAGER_ADDRESS,
            status = "failed",
            error_message = str(e)
        )

        db.add(tx_log)
        db.commit()

        raise HTTPException (
            status_code = 500,
            detail = str(e)
        )

@router.post("/temporary-revoke", response_model = TemporaryRevokeResponse)
def temporary_revoke_student (
    request: TemporaryRevokeRequest,
    db: Session = Depends(get_db)
):
    wallet = request.wallet_address.lower()

    user = db.query(User).filter(User.wallet_address == wallet).first() 

    if not user:
        raise HTTPException(
            status_code = 404,
            detail = "Student not found"
        )
    
    if user.role !="student":
        raise HTTPException (
            status_code = 400,
            detail = "User is not a student"
        )
    
    if user.status != "active":
        raise HTTPException (
            status_code = 403,
            detail = f"User account is {user.status}"
        )
    duration_seconds = convert_duration_to_seconds(
        request.months,
        request.days,
        request.hours,
        request.minutes
    )

    
    try:
        blockchain_result = revoke_student_temporarily(
            wallet,
            duration_seconds
        )

        tx_hash = blockchain_result["tx_hash"]

        revoked_until = datetime.utcnow() + timedelta(
            seconds=duration_seconds
        )

        revocation_log = RevocationLog (
            student_user_id = user.id,
            wallet_address = wallet,
            revocation_type = "temporary",
            reason = request.reason,
            duration_seconds=duration_seconds,
            revoked_until = revoked_until,
            revoked_by_admin_id = None,
            tx_hash = tx_hash,
            status = "active"
        )

        tx_log = TransactionLog(
            action = "temporary_revoke",
            performed_by_user_id = None,
            target_user_id = user.id,
            wallet_address = wallet,
            contract_address = MANAGER_ADDRESS,
            tx_hash = tx_hash,
            block_number = str(blockchain_result["block_number"]),
            gas_used = str(blockchain_result["gas_used"]),
            status = "success"
        )

        db.add(revocation_log)
        db.add(tx_log)
        db.commit()

        return {
            "message": "Student token temporarily revoked successfully",
            "wallet_address": wallet,
            "duration_seconds": duration_seconds,
            "tx_hash": tx_hash,
            "status": "temporarily_revoked"
        }
    
    except Exception as e:
        tx_log = TransactionLog(
            action = "temporary_revoke",
            performed_by_user_id = None,
            target_user_id = user.id,
            wallet_address = wallet,
            contract_address = MANAGER_ADDRESS,
            status = "failed",
            error_message = str(e)
        )

        db.add(tx_log)
        db.commit()

        raise HTTPException (
            status_code = 500,
            detail = str(e)
        )
    
@router.get("/dashboard", response_model = AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)):
    total_students = db.query(User).filter(User.role == "student").count()

    pending_students = db.query(User).filter(
        User.role == "students",
        User.status == "pending"
    ).count()

    active_students = db.query(User).filter(
        User.role == "students",
        User.status == "active"
    ).count()

    suspended_students = db.query(User).filter(
        User.role == "student",
        User.status == "suspended"    
    ).count()

    disabled_students = db.query(User).filter(
        User.role == "student",
        User.status == "disabled"
    ).count() 

    pending_token_requests = db.query(TokenRequest).filter(
        TokenRequest.request_status == "pending"
    ).count() 

    minted_tokens = db.query(TokenRequest).filter(
        TokenRequest.request_status == "minted"
    ).count()

    active_tokens = db.query(StudentToken).filter(
        StudentToken.status == "active"
    ).count()

    temporary_revocations = db.query(RevocationLog).filter(
        RevocationLog.revocation_type == "temporary"
    ).count()

    permanent_revocations = db.query(RevocationLog).filter(
        RevocationLog.revocation_type == "permanent"
    ).count()

    total_transactions = db.query(TransactionLog).count()

    return {
        "total_students": total_students,
        "pending_students": pending_students,
        "active_students": active_students,
        "suspended_students":suspended_students,
        "disabled_students": disabled_students,
        "pending_token_requests": pending_token_requests,
        "minted_tokens": minted_tokens,
        "active_tokens": active_tokens,
        "temporary_revocations": temporary_revocations,
        "permanent_revocations": permanent_revocations,
        "total_transactions": total_transactions
    }