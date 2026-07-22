from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, StudentProfile
from app.schemas import (
    StudentRegisterRequest,
    StudentRegisterResponse,
    WalletLoginRequest,
    WalletLoginResponse,
    NonceRequest,
    NonceResponse,
    SignatureVerifyRequest,
    SignatureVerifyResponse
)

import secrets
from eth_account.messages import encode_defunct
from eth_account import Account

router = APIRouter(prefix="/auth", tags=["Authentication"])

def is_valid_wallet_address(wallet_address: str) -> bool:
    return (
        wallet_address.startswith("0x")
        and len(wallet_address) == 42
    )

@router.post("/register", response_model=StudentRegisterResponse)
def register_student(request: StudentRegisterRequest, db: Session = Depends(get_db)):
    wallet = request.wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException (
            status_code=400,
            detail="Invalid wallet address"
        )
    
    existing_wallet=db.query(User).filter (
        User.wallet_address==wallet 
    ).first()

    if existing_wallet:
        raise HTTPException (
            status_code=400,
            detail="Wallet address already registered"
        )
    
    existing_student=db.query(StudentProfile).filter(
        StudentProfile.student_number==request.student_number
    ).first()

    if existing_student:
        raise HTTPException (
            status_code=400,
            detail="Student number already registered"
        )
    
    new_user=User(
        wallet_address=wallet,
        role="student",
        status="pending"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_profile=StudentProfile (
        user_id=new_user.id,
        student_number=request.student_number,
        full_name=request.full_name,
        faculty=request.faculty,
        department=request.department,
        batch=request.batch,
        academic_year=request.academic_year,
        email=request.email,
        phone=request.phone
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    return {
        "message": "Student Registered Successfully",
        "user_id": new_user.id,
        "wallet_address":new_user.wallet_address,
        "role": new_user.role,
        "status": new_user.status,
        "full_name": new_profile.full_name,
        "student_number": new_profile.student_number,
        "department": new_profile.department
    }

@router.post("/login", response_model=WalletLoginResponse)
def wallet_login (
    request: WalletLoginRequest,
    db: Session = Depends(get_db)
):
    wallet = request.wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException (
            status_code=400,
            detail="Invalid Wallet Address"
        )
    
    user=db.query(User).filter (
        User.wallet_address==wallet
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Wallet is not registered"
        )
    
    if user.status=="disabled":
        raise HTTPException(
            status_code=403,
            detail="This account is disabled"
        )
    
    return {
        "message": "Login successful",
        "user_id": user.id,
        "wallet_address": user.wallet_address,
        "role": user.role,
        "status": user.status
    }

@router.post("/nonce", response_model=NonceResponse)
def generate_nonce(
    request: NonceRequest,
    db: Session =Depends(get_db)
):
    wallet= request.wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address"
        )
    
    user=db.query(User).filter(
        User.wallet_address == wallet
    ).first()

    if not user:
        raise HTTPException(
            status_code= 404,
            detail= "Wallet is not registered"
        )
    
    nonce = secrets.token_hex(16)

    message = (
        f"login to PeraSoul Digital Student ID System. \n\n"
        f"Wallet: {wallet} \n"
        f"Nonce: {nonce}"
    )

    user.login_nonce = message
    db.commit() 

    return {
        "message" : message,
        "wallet_address": wallet,
        "nonce": nonce
    }

@router.post("/verify-signature", response_model=SignatureVerifyResponse)
def verify_signature(
    request: SignatureVerifyRequest,
    db: Session = Depends(get_db)
):
    wallet = request.wallet_address.lower()

    if not is_valid_wallet_address(wallet):
        raise HTTPException (
            status_code=400,
            detail="Invalid wallet address"
        )
    
    user = db.query(User).filter(
        User.wallet_address == wallet
    ).first()

    if not user:
        raise HTTPException (
            status_code=404,
            detail="Wallet is not registered"
        )
    
    if not user.login_nonce:
        raise HTTPException (
            status_code=400,
            detail="No login nonce found. Please request a nonce first."
        )
    
    try:
        encoded_message = encode_defunct(text=user.login_nonce)

        recovered_address=Account.recover_message(
            encoded_message,
            signature=request.signature
        ).lower()

    except Exception:
        raise HTTPException (
            status_code=400,
            detail="Invalid signature"
        )
    
    if recovered_address !=wallet:
        raise HTTPException (
            status_code=401,
            detail="Signature verification failed"
        )
    
    user.login_nonce = None
    db.commit() 

    return {
        "message": "Wallet signature verified. Login successful.",
        "user_id": user.id,
        "wallet_address": user.wallet_address,
        "role": user.role,
        "status":user.status
    }