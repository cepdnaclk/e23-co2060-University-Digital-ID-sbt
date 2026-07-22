from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User,
    TokenRequest,
    StudentProfile,
    StudentToken,
    TransactionLog
) 

from app.schemas import TokenRequestCreate, TokenRequestResponse, StudentDashboardResponse 
from app.blockchain.contract_service import (
    verify_student_on_chain,
    get_remaining_revocation_time
)

router = APIRouter(prefix="/student", tags=["Student"])

def is_valid_wallet_address(wallet_address: str) -> bool:
    return wallet_address.startswith("0x") and len(wallet_address)==42

def format_remaining_time(seconds: int):
    if seconds <= 0:
        return {
            "months": 0,
            "days": 0,
            "hours": 0,
            "minutes": 0
        }
    months = seconds // (30 * 24 * 60 * 60)
    seconds %= (30 * 24 * 60 * 60)

    days = seconds // (24 * 60 * 60)
    seconds %= (24 * 60 * 60) 

    hours = seconds // (60 * 60)
    seconds %= (60 * 60)

    minutes = seconds // 60

    return {
        "months": months,
        "days": days,
        "hours": hours,
        "minutes": minutes
    }

@router.post("/request-token", response_model=TokenRequestResponse)
def request_token(
    request: TokenRequestCreate,
    db: Session = Depends(get_db)
):
    wallet = request.wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address"
        )
    
    user = db.query(User).filter(User.wallet_address == wallet).first()

    if not user:
        raise HTTPException (
            status_code=404,
            detail="Wallet is not registered"
        )
    
    if user.role !="student":
        raise HTTPException (
            status_code=403,
            detail="Only student can request tokens"
        )
    
    existing_pending = db.query(TokenRequest).filter(
        TokenRequest.wallet_address == wallet,
        TokenRequest.request_status == "pending"
    ).first()

    if existing_pending:
        raise HTTPException(
            status_code=400,
            detail="Token request already pending"
        )
    
    if user.status != "active":
        raise HTTPException (
            status_code = 403,
            detail = f"User account is {user.status}. Only active students can request tokens."
        )
    
    token_request = TokenRequest(
        student_user_id=user.id,
        wallet_address = wallet,
        request_status="pending",
        request_note=request.request_note
    )

    db.add(token_request)
    db.commit()
    db.refresh(token_request)

    return token_request

@router.get("/dashboard/{wallet_address}", response_model=StudentDashboardResponse)
def get_student_dashboard(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    wallet = wallet_address.lower()

    user = db.query(User).filter(User.wallet_address == wallet).first()

    if not user:
        raise HTTPException (
            status_code = 404,
            detail = "Student not found"
        )
    
    if user.role != "student":
        raise HTTPException (
            status_code = 400,
            detail = "User is not a student"
        )
    
    profile = db.query(StudentProfile).filter (
        StudentProfile.user_id == user.id
    ).first()

    latest_request = db.query(TokenRequest).filter (
        TokenRequest.student_user_id == user.id
    ).order_by(TokenRequest.id.desc()).first()

    student_token = db.query(StudentToken).filter(
        StudentToken.student_user_id == user.id
    ).order_by(StudentToken.id.desc()).first()

    latest_tx = db.query(TransactionLog).filter(
        TransactionLog.target_user_id == user.id
    ).order_by(TransactionLog.id.desc()).first()

    remaining_seconds = 0

    formatted_time = {
        "months": 0,
        "days": 0,
        "hours": 0,
        "minutes": 0
    }

    try:
        is_valid = verify_student_on_chain(wallet)
        remaining_seconds = get_remaining_revocation_time(wallet)

        formatted_time = format_remaining_time(remaining_seconds)
    except Exception:
        is_valid = False
        remaining_time = 0

    return {
        "wallet_address": wallet,
        "full_name": profile.full_name if profile else None,
        "student_number": profile.student_number if profile else None,
        "faculty": profile.faculty if profile else None,
        "department": profile.department if profile else None,
        "batch": profile.batch if profile else None,
        "academic_year": profile.academic_year if profile else None,
        "account_status": user.status,
        "token_request_status": latest_request.request_status if latest_request else None,
        "token_status": student_token.status if student_token else None,
        "latest_tx_hash": latest_tx.tx_hash if latest_tx else None,
        "is_valid_on_chain": is_valid,
        "remaining_revocation_seconds": remaining_seconds,
        "remaining_revocation_time": formatted_time
    }